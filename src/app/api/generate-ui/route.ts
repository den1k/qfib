import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const API_KEY = process.env.XAI_API_KEY;  // Server-only env var

const SYSTEM_PROMPT = `You are an expert UI designer for IoT device control interfaces. Generate or modify complete, self-contained HTML for interactive controls that work with a custom renderer.

Key requirements:
- Generate precisely and minimally what the user explicitly requests. Do not add extra controls, features, buttons, sliders, or elements unless specifically mentioned. Keep simple requests focused—avoid comprehensive additions.
- Use minimal Tailwind CSS classes only for layout and responsiveness (e.g., flex, grid, space-y/x, p-*, gap-*, w-*, h-*, rounded for basic shape). Do not include colors (bg-*, text-*), borders, typography (font-*), or hover effects—the parent container will apply the retro terminal aesthetic (dark backgrounds, green text, etc.).
- Structure as a single top-level <div class="..."> containing only the requested elements, or <form> if submission-based.
- For inputs (text, range, checkbox, select, textarea): add data-field="fieldName" to track values. Use appropriate types and labels only if needed for the request.
- For buttons and interactive elements: add data-command="command:string" where command can use {fieldName} or {value} placeholders for dynamic values.
- For sliders/ranges (only if requested): use type="range", data-field, data-command="command:{value}", min/max/step as appropriate, and a display span for current value if specified.
- Support forms (only if requested): wrap in <form data-send-mode="onSubmit">, add data-command to submit button.
- Debouncing/throttling (only if relevant to request): add data-send-mode="debounced" or "throttled", data-debounce-ms="300" to inputs that change frequently.
- No external dependencies, scripts, or CSS links—just inline Tailwind classes for structure.
- Output ONLY the complete HTML block starting with <div> or <form> and ending with </div> or </form>, no explanations, no markdown code fences.

When modifying existing HTML:
- Preserve all existing structure, attributes (especially data-*), and functionality exactly.
- Modify precisely as requested in the prompt, without adding unrelated features or elements.
- Ensure the output is a complete, standalone HTML snippet that can replace the original, but only change what's specified.

Examples:

Simple new WASD controls (exact request, minimal layout):
<div class="flex flex-col items-center space-y-2 p-4">
  <div class="grid grid-cols-3 gap-2">
    <div></div>
    <button data-command="forward" class="w-12 h-12 rounded">W ↑</button>
    <div></div>
    <button data-command="left" class="w-12 h-12 rounded">A ←</button>
    <button data-command="stop" class="w-12 h-12 rounded">S</button>
    <button data-command="right" class="w-12 h-12 rounded">D →</button>
    <div></div>
    <button data-command="reverse" class="w-12 h-12 rounded">↓</button>
    <div></div>
  </div>
</div>

Modification example: Add only a single button to existing div (no extras).
If context: <div class="p-4">Existing content</div>
Prompt: "Add a forward button"
Output: <div class="p-4 space-y-2">Existing content<button data-command="forward" class="px-4 py-2 rounded">Forward</button></div>

Precise light toggle (no extras):
<div class="p-4 space-y-2">
  <label class="flex items-center space-x-2">
    <input type="checkbox" data-field="lightsOn" data-command="lights:{lightsOn ? 'on' : 'off'}" class="rounded">
    <span>Lights</span>
  </label>
</div>`;

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json() as { messages?: Message[]; prompt?: string; contextHtml?: string; };
    let messages: Message[] = body.messages || [];
    const contextHtml = body.contextHtml;

    if (messages.length === 0) {
      const prompt = body.prompt;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt or messages required' }, { status: 400 });
      }
      messages = [{ role: 'user' as const, content: prompt }];
    }

    // Use last assistant message as context if no explicit contextHtml
    let effectiveContext = contextHtml;
    if (!effectiveContext && messages.length > 1) {
      const lastAssistant = messages.findLast((msg: Message) => msg.role === 'assistant');
      if (lastAssistant) {
        effectiveContext = lastAssistant.content;
      }
    }

    // Build user message for modification if context
    if (effectiveContext && messages.length > 0 && messages[messages.length - 1].role === 'user') {
      const lastUser = messages[messages.length - 1].content;
      messages[messages.length - 1] = { role: 'user' as const, content: `Modify this existing HTML: \n\n${effectiveContext}\n\naccording to the following changes: ${lastUser}. Generate ONLY the requested changes without adding new unrelated features.` };
    }

    const xaiResponse = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-code-fast',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.3,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!xaiResponse.ok) {
      throw new Error(`xAI API error: ${xaiResponse.statusText}`);
    }

    if (!xaiResponse.body) {
      throw new Error('No response body from xAI');
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let accumulatedContent = '';
        let isDone = false;

        const reader = xaiResponse.body!.getReader();
        const decoder = new TextDecoder();

        async function pump(): Promise<void> {
          try {
            const { done, value } = await reader.read();
            if (done) {
              // Send complete event with final cleaned HTML
              let cleanHtml = accumulatedContent.trim();
              // Remove ```html or ``` blocks if present
              cleanHtml = cleanHtml.replace(/```(?:html|)?\s*\n?([\s\S]*?)\n?```/g, '$1').trim();
              // Try to extract full div or form if wrapped in extra text
              if (cleanHtml.includes('<div') && cleanHtml.includes('</div>')) {
                cleanHtml = cleanHtml.match(/<div[^>]*>[\s\S]*<\/div>/i)?.[0] || cleanHtml;
              } else if (cleanHtml.includes('<form') && cleanHtml.includes('</form>')) {
                cleanHtml = cleanHtml.match(/<form[^>]*>[\s\S]*<\/form>/i)?.[0] || cleanHtml;
              }

              if (!cleanHtml.startsWith('<')) {
                cleanHtml = accumulatedContent.trim();
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', html: cleanHtml })}\n\n`));

              // Send [DONE]
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));

              isDone = true;
              controller.close();
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            // Parse xAI SSE format to extract content deltas
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') {
                  // xAI done, trigger our complete
                  await pump();
                  return;
                }
                try {
                  const data = JSON.parse(dataStr);
                  const deltaContent = data.choices?.[0]?.delta?.content;
                  if (deltaContent) {
                    accumulatedContent += deltaContent;
                    // Send partial with current accumulation (light cleanup)
                    let partialHtml = accumulatedContent.trim();
                    // Basic partial cleanup (remove incomplete fences)
                    partialHtml = partialHtml.replace(/```(?:html|)?\s*\n?([\s\S]*?)$/g, '$1').trim();

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'partial', html: partialHtml })}\n\n`));
                  }
                } catch (parseErr) {
                  // Ignore parse errors in stream
                }
              }
            }

            await pump();
          } catch (error) {
            console.error('Stream pump error:', error);
            controller.error(error as Error);
          }
        }

        pump();
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Error in generation:', error);
    return NextResponse.json({ error: 'Failed to generate UI' }, { status: 500 });
  }
}
