'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export interface HTMLControlConfig {
  debounceMs?: number;
  throttleMs?: number;
  globalSendMode?: 'immediate' | 'debounced' | 'throttle' | 'onSubmit';
}

interface HTMLControlRendererProps {
  html: string;
  config: HTMLControlConfig;
  connected: boolean;
  onCommand: (command: string) => void;
  previewMode?: boolean;
}

interface FieldValueMap {
  [fieldName: string]: any;
}

export function HTMLControlRenderer({ html, config, connected, onCommand, previewMode = false }: HTMLControlRendererProps) {
  const [fieldValues, setFieldValues] = useState<FieldValueMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const throttleTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastThrottleTimes = useRef<Map<string, number>>(new Map());

  const fieldValuesRef = useRef(fieldValues);
  useEffect(() => {
    fieldValuesRef.current = fieldValues;
  }, [fieldValues]);

  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // New: Synchronous latest values for immediate use in commands
  const latestFieldValuesRef = useRef<FieldValueMap>({});

  const defaultConfig = useMemo(() => ({
    debounceMs: 300,
    throttleMs: 100,
    globalSendMode: 'immediate' as const,
    ...config
  }), [config]);

  // Template substitution function - use latest ref for up-to-date values
  const getElementValue = useCallback((element: HTMLElement): any => {
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') return element.checked;
      if (element.type === 'number') return element.valueAsNumber || parseFloat(element.value) || 0;
      if (element.type === 'range') return element.valueAsNumber || parseFloat(element.value) || 0;
      return element.value;
    }
    if (element instanceof HTMLSelectElement) return element.value;
    if (element instanceof HTMLTextAreaElement) return element.value;
    return element.textContent || '';
  }, []);

  const substituteTemplate = useCallback((template: string, element?: HTMLElement): string => {
    let command = template;

    // Replace field values using latest ref
    const currentFieldValues = latestFieldValuesRef.current;
    Object.keys(currentFieldValues).forEach(fieldName => {
      const value = currentFieldValues[fieldName];
      const placeholder = `{${fieldName}}`;
      command = command.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));

      // Handle nested properties like {motor.speed}
      if (typeof value === 'object' && value !== null) {
        Object.keys(value).forEach(nestedKey => {
          const nestedPlaceholder = `{${fieldName}.${nestedKey}}`;
          command = command.replace(new RegExp(nestedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value[nestedKey]));
        });
      }
    });

    // Replace {value} with element value if available
    if (element) {
      const elementValue = getElementValue(element);
      command = command.replace(/\{value\}/g, String(elementValue));
    }

    return command;
  }, [getElementValue]);  // Note: getElementValue is stable

  // Apply timing controls - unchanged
  const applyTiming = useCallback((element: HTMLElement, command: string, sendMode?: string) => {
    if (!connected) return;

    const effectiveSendMode = sendMode || defaultConfig.globalSendMode;
    const elementId = element.id || element.dataset.command || Math.random().toString();

    // Clear existing timers
    const existingDebounceTimer = debounceTimers.current.get(elementId);
    if (existingDebounceTimer) {
      clearTimeout(existingDebounceTimer);
    }
    const existingThrottleTimer = throttleTimers.current.get(elementId);
    if (existingThrottleTimer) {
      clearTimeout(existingThrottleTimer);
    }

    const sendCommand = () => {
      const processedCommand = substituteTemplate(command, element);
      onCommand(processedCommand);
      throttleTimers.current.delete(elementId);
    };

    switch (effectiveSendMode) {
      case 'immediate':
        sendCommand();
        break;

      case 'debounced':
        const debounceMs = element.dataset.debounceMs ? parseInt(element.dataset.debounceMs) : defaultConfig.debounceMs!;
        const debounceTimer = setTimeout(() => {
          sendCommand();
          debounceTimers.current.delete(elementId);
        }, debounceMs);
        debounceTimers.current.set(elementId, debounceTimer);
        break;

      case 'throttle':
        const throttleMs = element.dataset.throttleMs ? parseInt(element.dataset.throttleMs) : defaultConfig.throttleMs!;
        const now = Date.now();
        const lastTime = lastThrottleTimes.current.get(elementId) || 0;

        if (now - lastTime >= throttleMs) {
          sendCommand();
          lastThrottleTimes.current.set(elementId, now);
        } else {
          const throttleTimer = setTimeout(() => {
            sendCommand();
            lastThrottleTimes.current.set(elementId, Date.now());
          }, throttleMs - (now - lastTime));
          throttleTimers.current.set(elementId, throttleTimer);
        }
        break;

      case 'onSubmit':
        // Handled by form submit event
        break;
    }
  }, [connected, defaultConfig, substituteTemplate, onCommand]);

  // Handle element interactions - unchanged
  const handleElementInteraction = useCallback((element: HTMLElement, event: Event) => {
    const command = element.dataset.command;
    if (!command || !connected) return;

    const sendMode = element.dataset.sendMode;
    applyTiming(element, command, sendMode);
  }, [applyTiming, connected]);

  // Update field display elements - uses state ref for displays
  const updateFieldDisplays = useCallback((fieldName: string, value: any) => {
    if (!containerRef.current) return;

    const displayElements = containerRef.current.querySelectorAll(`[data-field="${fieldName}"]:not([data-field-input])`);
    displayElements.forEach((el: Element) => {
      if (el instanceof HTMLElement && 
          !(el instanceof HTMLInputElement) && 
          !(el instanceof HTMLSelectElement) && 
          !(el instanceof HTMLTextAreaElement)) {
        el.textContent = String(value);
      }
    });
  }, []);

  // Handle form field changes - update latest ref synchronously before applyTiming
  const handleFieldChange = useCallback((element: HTMLElement) => {
    const fieldName = element.dataset.field;
    if (!fieldName) return;

    const value = getElementValue(element);
    
    // Update latest ref synchronously for immediate use in commands
    latestFieldValuesRef.current = { ...latestFieldValuesRef.current, [fieldName]: value };
    
    // Update state for display updates (async)
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));

    // Update display elements
    updateFieldDisplays(fieldName, value);

    // If element has a command, send it based on send mode
    const command = element.dataset.command;
    if (command) {
      const sendMode = element.dataset.sendMode;
      applyTiming(element, command, sendMode);
    }
  }, [getElementValue, updateFieldDisplays, applyTiming]);

  // Handle form submission - unchanged
  const handleFormSubmit = useCallback((event: Event) => {
    event.preventDefault();
    if (!connected || isSubmittingRef.current) return;

    const form = event.target as HTMLFormElement;
    const submitElements = form.querySelectorAll('[data-command]');

    submitElements.forEach((element: Element) => {
      if (element instanceof HTMLElement) {
        const command = element.dataset.command;
        if (command) {
          const processedCommand = substituteTemplate(command, element);
          onCommand(processedCommand);
        }
      }
    });

    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 1000);
  }, [connected, substituteTemplate, onCommand]);

  // Hydrate HTML and attach event listeners - also initialize latestFieldValuesRef from initialFieldValues
  useEffect(() => {
    if (!containerRef.current || !html) return;

    // Clear existing content and timers
    containerRef.current.innerHTML = '';
    debounceTimers.current.forEach(timer => clearTimeout(timer));
    throttleTimers.current.forEach(timer => clearTimeout(timer));
    debounceTimers.current.clear();
    throttleTimers.current.clear();
    lastThrottleTimes.current.clear();

    // Create a temporary container to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Extract initial field values from display elements (in tempDiv)
    const initialFieldValues: FieldValueMap = {};
    const displayElements = tempDiv.querySelectorAll('[data-field]:not(input):not(select):not(textarea)');
    displayElements.forEach((el: Element) => {
      if (el instanceof HTMLElement && el.dataset.field) {
        const fieldName = el.dataset.field;
        if (!(fieldName in initialFieldValues)) {
          let initialValueStr = el.textContent?.trim() || '';
          const numValue = parseFloat(initialValueStr);
          initialFieldValues[fieldName] = isNaN(numValue) ? initialValueStr : numValue;
        }
      }
    });

    // Move parsed content to actual container (now in DOM)
    while (tempDiv.firstChild) {
      containerRef.current.appendChild(tempDiv.firstChild);
    }

    // Now set initial values on form elements (query from live container)
    const formElements = containerRef.current.querySelectorAll('input[data-field], select[data-field], textarea[data-field]');
    formElements.forEach((el: Element) => {
      if (el instanceof HTMLElement && el.dataset.field) {
        const fieldName = el.dataset.field;
        const initialVal = initialFieldValues[fieldName];
        if (initialVal !== undefined) {
          if (el.tagName === 'INPUT') {
            const inputEl = el as HTMLInputElement;
            if (inputEl.type === 'checkbox') {
              inputEl.checked = Boolean(initialVal);
            } else if (inputEl.type === 'number' || inputEl.type === 'range') {
              const numVal = typeof initialVal === 'number' ? initialVal : parseFloat(String(initialVal));
              if (!isNaN(numVal)) {
                inputEl.value = numVal.toString();
              }
            } else {
              inputEl.value = String(initialVal);
            }
          } else if (el.tagName === 'SELECT') {
            const selectEl = el as HTMLSelectElement;
            const valStr = String(initialVal);
            const option = Array.from(selectEl.options).find(opt => opt.value === valStr);
            if (option) {
              option.selected = true;
            } else {
              selectEl.value = valStr;
            }
          } else if (el.tagName === 'TEXTAREA') {
            (el as HTMLTextAreaElement).value = String(initialVal);
          }
        }
      }
    });

    // Initialize latest ref with initial values
    Object.assign(latestFieldValuesRef.current, initialFieldValues);

    // Attach event listeners (this marks inputs with data-field-input)
    const setupEventListeners = (element: Element) => {
      if (!(element instanceof HTMLElement)) return;

      // Handle buttons and interactive elements
      if (element.tagName === 'BUTTON' || element.onclick !== null || element.dataset.command) {
        element.addEventListener('click', (e) => handleElementInteraction(element, e));
      }

      // Handle form elements
      if (element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement) {
        // Mark inputs so they're excluded from display updates
        element.setAttribute('data-field-input', 'true');
        
        // Ensure inputs are uncontrolled - never set their value property after this point

        // Automatically add autocomplete attributes to prevent password manager issues
        if (element instanceof HTMLInputElement) {
          // Remove all name/id attributes to prevent password managers from recognizing fields
          element.removeAttribute('name');
          element.removeAttribute('id');
          
          // For password fields, use 'new-password' which prevents autofill
          if (element.type === 'password') {
            element.setAttribute('autocomplete', 'new-password');
          } else {
            // For other inputs, use 'off'
            element.setAttribute('autocomplete', 'off');
          }
          
          // Set comprehensive anti-autofill attributes
          element.setAttribute('autocorrect', 'off');
          element.setAttribute('autocapitalize', 'off');
          element.setAttribute('spellcheck', 'false');
          element.setAttribute('data-form-type', 'other');
          element.setAttribute('data-lpignore', 'true'); // LastPass
          element.setAttribute('data-1p-ignore', 'true'); // 1Password
          element.setAttribute('data-dashlane-ignore', 'true'); // Dashlane
          element.setAttribute('data-bitwarden-ignore', 'true'); // Bitwarden
        }

        // Add event listeners for input tracking (use passive to ensure we don't interfere)
        const inputHandler = (e: Event) => {
          handleFieldChange(element);
        };
        element.addEventListener('input', inputHandler, { passive: true });
        element.addEventListener('change', inputHandler, { passive: true });
        
        // NEVER disable inputs - always allow typing
        // Explicitly ensure inputs are enabled and not readonly
        element.disabled = false;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.readOnly = false;
        }
        element.removeAttribute('disabled');
        element.removeAttribute('readonly');
      }

      // Handle form submission
      if (element.tagName === 'FORM') {
        element.addEventListener('submit', handleFormSubmit);
      }

      // Recursively setup children
      element.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          setupEventListeners(child as Element);
        }
      });
    };

    // Setup listeners for all elements
    containerRef.current.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        setupEventListeners(node as Element);
      }
    });

    // Set initial field values in state to update displays
    if (Object.keys(initialFieldValues).length > 0) {
      setFieldValues(initialFieldValues);
    }

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Clear all timers
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      throttleTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.clear();
      throttleTimers.current.clear();
      lastThrottleTimes.current.clear();
    };
  }, [html, handleElementInteraction, handleFieldChange, handleFormSubmit, getElementValue, updateFieldDisplays]);

  // Update field displays when field values change - unchanged
  useEffect(() => {
    Object.keys(fieldValues).forEach(fieldName => {
      updateFieldDisplays(fieldName, fieldValues[fieldName]);
    });
  }, [fieldValues, updateFieldDisplays]);

  // Update disabled states when connection changes - unchanged
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDisabledStates = (element: Element) => {
      if (!(element instanceof HTMLElement)) return;

      if (element.tagName === 'BUTTON' || element.dataset.command) {
        if (previewMode) {
          element.removeAttribute('disabled');
        } else if (connected) {
          element.removeAttribute('disabled');
        } else {
          element.setAttribute('disabled', 'true');
        }
      }

      // NEVER disable inputs - always ensure they're enabled
      if (element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement) {
        // Set properties directly to ensure they're truly enabled
        element.disabled = false;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.readOnly = false;
        }
        element.removeAttribute('disabled');
        element.removeAttribute('readonly');
      }

      // Recursively update children
      element.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          updateDisabledStates(child as Element);
        }
      });
    };

    containerRef.current.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        updateDisabledStates(node as Element);
      }
    });
  }, [connected, previewMode]);

  if (!html) {
    return (
      <div className="no-html">
        <p>No HTML control content provided.</p>
      </div>
    );
  }

  return (
    <div className="html-control-renderer">
      <div ref={containerRef} className="terminal-panel-content" />
    </div>
  );
}
