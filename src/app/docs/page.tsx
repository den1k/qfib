import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto text-xs prose-xs prose-invert">
      <h1 className="text-3xl font-bold mb-8">Mrln Documentation</h1>
      
      <p>Welcome to Mrln's docs. This covers building controls, connections, and AI features.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">HTML Controls</h2>
      <p>This guide explains how to create interactive controls for your IoT devices using custom HTML in the editor. The renderer supports data attributes for commands, fields, and timing, plus template variables for dynamic values. Use Tailwind CSS for styling – no extra CSS needed.</p>

      <h3 className="text-xl font-semibold mt-6 mb-2">Data Attributes</h3>
      <p>Add these to elements like buttons, inputs, or forms to make them interactive.</p>
      
      <ul className="space-y-2">
        <li>
          <code className="px-2 py-1 rounded">data-command="your-command"</code>
          <p>Defines the command to send. Use templates like <code data-command="move:{'{speed}'}" className="...">Go</code> where <code>{'{speed}'}</code> is a field value.</p>
        </li>
        <li>
          <code className="px-2 py-1 rounded">data-send-mode="immediate|debounced|throttled|onSubmit"</code>
          <p>Timing: Immediate (default), debounced (wait for pause), throttled (rate limit), onSubmit (form only).</p>
        </li>
        <li>
          <code className="px-2 py-1 rounded">data-field="fieldName"</code>
          <p>Tracks value for templates. E.g., <code>&lt;input data-field="speed" type="range"&gt;</code> binds <code>{'{speed}'}</code>.</p>
        </li>
        <li>
          <code className="px-2 py-1 rounded">data-debounce-ms="300"</code>
          <p>Custom debounce time (ms) for that element.</p>
        </li>
        <li>
          <code className="px-2 py-1 rounded">data-throttle-ms="100"</code>
          <p>Custom throttle time (ms).</p>
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-2">Template Variables</h3>
      <p>Dynamic placeholders in data-command:</p>
      <ul className="space-y-2">
        <li><code>{'{value}'}</code> - Current element's value (e.g., slider position).</li>
        <li><code>{'{fieldName}'}</code> - Value from data-field (e.g., {'{speed}'} from another input).</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-2">Examples</h3>

      <h4>Simple Button</h4>
      <pre className="p-4 rounded overflow-auto mt-2 mb-4">
        <code className="text-xs block">
{`<button data-command="power:on" className="bg-green-500 px-4 py-2 rounded">
  Turn On
</button>`}
        </code>
      </pre>
      <p>Sends "power:on" immediately on click.</p>

      <h4>Slider with Debounce</h4>
      <pre className="p-4 rounded overflow-auto mt-2 mb-4">
        <code className="text-xs block">
{`<label>Speed: <span data-field="speed">50</span></label>
<input type="range" min="0" max="100" data-field="speed" data-command="motor:speed={value}" data-send-mode="debounced" data-debounce-ms="300" className="w-full" />`}
        </code>
      </pre>
      <p>Updates "motor:speed=75" after 300ms pause; span shows current value.</p>

      <h4>Form with Submit</h4>
      <pre className="p-4 rounded overflow-auto mt-2 mb-4">
        <code className="text-xs block">
{`<form data-send-mode="onSubmit">
  <input data-field="ssid" placeholder="WiFi Name" className="border p-2 mb-2 w-full" />
  <input data-field="pass" type="password" placeholder="Password" className="border p-2 mb-2 w-full" />
  <button type="submit" data-command="connect:ssid={ssid};pass={pass}" className="bg-blue-500 text-white p-2 rounded">
    Connect
  </button>
</form>`}
        </code>
      </pre>
      <p>Sends "connect:ssid=MyNet;pass=secret" on form submit.</p>

      <h4>Checkbox Toggle</h4>
      <pre className="p-4 rounded overflow-auto mt-2 mb-4">
        <code className="text-xs block">
{`<label>
  <input type="checkbox" data-field="light" data-command="light={value}" />
  Light On
</label>`}
        </code>
      </pre>
      <p>Sends "light:true" or "light:false" on change.</p>

      <h3 className="text-xl font-semibold mt-6 mb-2">Tips</h3>
      <ul className="space-y-2">
        <li>Use Tailwind classes for responsive styling (e.g., <code>flex gap-2 p-4 rounded</code>).</li>
        <li>Nested fields: {'{motor.speed}'} if field is an object.</li>
        <li>Test in preview before saving – connected=false during edit.</li>
        <li>Global config (debounceMs, etc.) applies if no data-* override.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Other Features</h2>
      <p>Coming soon:</p>
      <ul className="space-y-2">
        <li><strong>MQTT Setup</strong>: Configuring brokers and topics.</li>
        <li><strong>BLE Connection</strong>: Pairing and command sending.</li>
        <li><strong>AI Editing</strong>: Using Grok to generate/modify HTML.</li>
      </ul>

      <p className="mt-8 text-sm opacity-70">
        <Link href="/projects" className="underline">Back to Projects</Link>
      </p>
    </div>
  );
}
