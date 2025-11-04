import React from 'react';
import { FieldTemplateProps, ObjectFieldTemplateProps, TitleFieldProps, BaseInputTemplateProps } from '@rjsf/utils';
import { SimpleRCControls } from './SimpleRCControls';

// Custom Field Template
export function CustomFieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    children,
    displayLabel,
    rawErrors = [],
    rawHelp,
    rawDescription,
    classNames,
    style,
    disabled,
    label,
    hidden,
    onDropPropertyClick,
    onKeyChange,
    readonly,
    required,
    schema,
    uiSchema
  } = props;

  if (hidden) {
    return <div style={{ display: 'none' }}>{children}</div>;
  }

  // Check if this is a range input field (don't show label as it's handled in the widget)
  const isRangeField = schema.type === 'number' && uiSchema?.['ui:widget'] === 'range';

  return (
    <div className={`field-wrapper ${classNames}`} style={style}>
      {displayLabel && label && !isRangeField && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {rawDescription && (
        <div className="field-description">{rawDescription}</div>
      )}
      {children}
      {rawErrors.length > 0 && (
        <div className="field-errors">
          {rawErrors.map((error, index) => (
            <div key={index} className="error-message">{error}</div>
          ))}
        </div>
      )}
      {rawHelp && (
        <div className="field-help">{rawHelp}</div>
      )}
    </div>
  );
}

// Custom Object Field Template
export function CustomObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const {
    title,
    description,
    properties,
    required,
    disabled,
    readonly,
    uiSchema,
    idSchema,
    schema,
    formData,
    onAddClick,
    formContext
  } = props;

  // If this object field has a custom widget specified, don't render it as an object
  // Instead, let RJSF handle it as a widget (this check is here for safety, but
  // RJSF should handle widget rendering before reaching ObjectFieldTemplate)
  const hasCustomWidget = uiSchema?.['ui:widget'];
  if (hasCustomWidget && properties.length === 0) {
    // This shouldn't normally happen, but if it does, return null
    // The widget should be rendered by the field template instead
    return null;
  }

  // Special handling for schemas with custom buttons
  // But we still want to show the form fields if there are properties
  const hasCustomButtons = formContext?.customButtons && formContext.customButtons.length > 0;
  const hasFormFields = properties.length > 0;

  if (hasCustomButtons) {
    // Separate buttons into form-related (WiFi/Provision) and other buttons
    const formButtons: any[] = [];
    const otherButtons: any[] = [];
    
    formContext.customButtons.forEach((button: any) => {
      if (button.command === 'PROVISION:FORM_SUBMIT' || button.group === 'WiFi') {
        formButtons.push(button);
      } else {
        otherButtons.push(button);
      }
    });

    // Group other buttons by their group property
    const buttonGroups = otherButtons.reduce((groups: any, button: any) => {
      const groupName = button.group || 'Default';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(button);
      return groups;
    }, {});

    return (
      <div className="object-field movement-controls">
        {title && (
          <h3 className="object-title">{title}</h3>
        )}
        {description && (
          <div className="object-description">{description}</div>
        )}
        {/* Render form fields if they exist */}
        {hasFormFields && (
          <div className="mb-4">
            {properties.map((prop) => prop.content)}
            {/* Render form-related buttons directly under the fields */}
            {formButtons.length > 0 && (
              <div className="mt-3">
                <div className="movement-buttons">
                  {formButtons.map((button: any) => (
                    <button
                      key={button.id}
                      type="button"
                      className="movement-button"
                      onClick={() => {
                        if (formContext.onCommand) {
                          // Special handling for PROVISION:FORM_SUBMIT - trigger form submission
                          if (button.command === 'PROVISION:FORM_SUBMIT') {
                            // Use the submitForm function from formContext if available
                            if ((formContext as any).submitForm) {
                              (formContext as any).submitForm();
                            } else {
                              // Fallback: find the form element and trigger submit
                              const formElement = (document.querySelector('.dynamic-form-renderer form') as HTMLFormElement);
                              if (formElement) {
                                formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                              }
                            }
                          } else {
                            formContext.onCommand(button.command);
                          }
                        }
                      }}
                      disabled={disabled || readonly}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Render other custom buttons in groups */}
        {Object.keys(buttonGroups).length > 0 && Object.entries(buttonGroups).map(([groupName, buttons]: [string, any]) => (
          <div key={groupName} className="mb-4 last:mb-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
              {groupName}
            </h4>
            <div className="movement-buttons">
              {buttons.map((button: any) => (
                <button
                  key={button.id}
                  type="button"
                  className="movement-button"
                  onClick={() => {
                    if (formContext.onCommand) {
                      formContext.onCommand(button.command);
                    }
                  }}
                  disabled={disabled || readonly}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Check if properties have groups defined
  const hasGroups = properties.some((prop) => {
    const propSchema = schema.properties?.[prop.name];
    return propSchema && propSchema['x-group'];
  });

  if (hasGroups) {
    // Group properties by their x-group
    const propertyGroups: { [key: string]: any[] } = {};
    const ungroupedProps: any[] = [];

    properties.forEach((prop) => {
      const propSchema = schema.properties?.[prop.name];
      const groupName = propSchema?.['x-group'];
      
      if (groupName) {
        if (!propertyGroups[groupName]) {
          propertyGroups[groupName] = [];
        }
        propertyGroups[groupName].push(prop);
      } else {
        ungroupedProps.push(prop);
      }
    });

    return (
      <div className="object-field">
        {title && (
          <h3 className="object-title">{title}</h3>
        )}
        {description && (
          <div className="object-description">{description}</div>
        )}
        {ungroupedProps.length > 0 && (
          <div className="object-properties mb-4">
            {ungroupedProps.map((prop) => prop.content)}
          </div>
        )}
        {Object.entries(propertyGroups).map(([groupName, groupProps]) => (
          <div key={groupName} className="mb-6 last:mb-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-80">
              {groupName}
            </h4>
            <div className="object-properties">
              {groupProps.map((prop) => prop.content)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="object-field">
      {title && (
        <h3 className="object-title">{title}</h3>
      )}
      {description && (
        <div className="object-description">{description}</div>
      )}
      <div className="object-properties">
        {properties.map((prop) => prop.content)}
      </div>
    </div>
  );
}

// Custom Title Field
export function CustomTitleField(props: TitleFieldProps) {
  const { id, title, required } = props;
  
  return (
    <h2 id={id} className="title-field">
      {title}
      {required && <span className="required">*</span>}
    </h2>
  );
}

// Custom Base Input Template
export function CustomBaseInputTemplate(props: BaseInputTemplateProps) {
  const {
    id,
    placeholder,
    required,
    disabled,
    type,
    value,
    onChange,
    onBlur,
    onFocus,
    readonly,
    rawErrors = [],
    schema,
    uiSchema
  } = props;

  const inputProps = {
    id,
    placeholder,
    disabled,
    readOnly: readonly,
    value: value || '',
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    onBlur: onBlur && ((event: React.FocusEvent<HTMLInputElement>) => {
      onBlur(id, event.target.value);
    }),
    onFocus: onFocus && ((event: React.FocusEvent<HTMLInputElement>) => {
      onFocus(id, event.target.value);
    })
  };

  return (
    <div className="base-input-wrapper">
      <input
        {...inputProps}
        type={type || 'text'}
        className={`base-input ${rawErrors.length > 0 ? 'error' : ''}`}
      />
    </div>
  );
}

// Custom Button Templates
export const CustomButtonTemplates = {
  SubmitButton: (props: any) => (
    <button
      type="submit"
      className="submit-button"
      disabled={props.disabled}
    >
      {props.children || 'Submit'}
    </button>
  ),
  AddButton: (props: any) => (
    <button
      type="button"
      className="add-button"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children || 'Add'}
    </button>
  ),
  RemoveButton: (props: any) => (
    <button
      type="button"
      className="remove-button"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children || 'Remove'}
    </button>
  )
};

// Custom widgets for specific input types
export const customWidgets = {
  PasswordWidget: (props: any) => {
    const {
      id,
      value,
      onChange,
      onBlur,
      onFocus,
      disabled,
      readonly,
      placeholder,
      autofocus,
      uiSchema,
      schema,
      formContext,
      rawErrors,
      hideLabel,
      hideError,
      ...domProps
    } = props;
    
    return (
      <input
        {...domProps}
        id={id}
        type="password"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur && ((e) => onBlur(id, e.target.value))}
        onFocus={onFocus && ((e) => onFocus(id, e.target.value))}
        disabled={disabled}
        readOnly={readonly}
        placeholder={placeholder}
        autoFocus={autofocus}
        className="text-widget"
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
    );
  },
  TextWidget: (props: any) => {
    const {
      id,
      value,
      onChange,
      onBlur,
      onFocus,
      disabled,
      readonly,
      placeholder,
      autofocus,
      uiSchema,
      schema,
      formContext,
      rawErrors,
      hideLabel,
      hideError,
      ...domProps
    } = props;
    
    // Check if this field should have autocomplete disabled (e.g., WiFi SSID)
    const disableAutocomplete = uiSchema?.['ui:options']?.autocomplete === 'off' || 
                                 id?.includes('ssid') || 
                                 id?.includes('SSID');
    
    return (
      <input
        {...domProps}
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur && ((e) => onBlur(id, e.target.value))}
        onFocus={onFocus && ((e) => onFocus(id, e.target.value))}
        disabled={disabled}
        readOnly={readonly}
        placeholder={placeholder}
        autoFocus={autofocus}
        className="text-widget"
        type="text"
        autoComplete={disableAutocomplete ? "off" : undefined}
        data-1p-ignore={disableAutocomplete ? true : undefined}
        data-lpignore={disableAutocomplete ? "true" : undefined}
        data-form-type={disableAutocomplete ? "other" : undefined}
      />
    );
  },
  TextareaWidget: (props: any) => {
    const {
      id,
      value,
      onChange,
      onBlur,
      onFocus,
      disabled,
      readonly,
      placeholder,
      autofocus,
      uiSchema,
      schema,
      formContext,
      rawErrors,
      hideLabel,
      hideError,
      ...domProps
    } = props;
    
    return (
      <textarea
        {...domProps}
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur && ((e) => onBlur(id, e.target.value))}
        onFocus={onFocus && ((e) => onFocus(id, e.target.value))}
        disabled={disabled}
        readOnly={readonly}
        placeholder={placeholder}
        autoFocus={autofocus}
        className="textarea-widget"
        rows={uiSchema?.['ui:options']?.rows || 3}
      />
    );
  },
  SelectWidget: (props: any) => (
    <select
      id={props.id}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      disabled={props.disabled || props.readonly}
      autoFocus={props.autofocus}
      className="select-widget"
    >
      {props.options.enumOptions?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  RadioWidget: (props: any) => (
    <div className="radio-widget">
      {props.options.enumOptions?.map((option: any) => (
        <label key={option.value} className="radio-option">
          <input
            type="radio"
            name={props.id}
            value={option.value}
            checked={props.value === option.value}
            onChange={() => props.onChange(option.value)}
            className="radio-input"
          />
          <span className="radio-label">{option.label}</span>
        </label>
      ))}
    </div>
  ),
  RangeWidget: (props: any) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between w-full max-w-[280px]">
        <span className="text-[11px] font-medium uppercase tracking-wide">{props.label}</span>
        <span className="text-[11px] font-medium opacity-70">{props.value}</span>
      </div>
      <input
        type="range"
        className="range-input"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        min={props.schema.minimum}
        max={props.schema.maximum}
        step={props.schema.multipleOf || 1}
        disabled={props.disabled}
        readOnly={props.readonly}
        autoFocus={props.autofocus}
      />
    </div>
  ),
  ButtonWidget: (props: any) => (
    <button
      type="button"
      className="button-widget"
      onClick={() => props.onChange(props.schema.title || 'Button Clicked')}
    >
      {props.uiSchema?.['ui:options']?.label || props.schema.title || 'Button'}
    </button>
  ),
  SimpleRCWidget: (props: any) => {
    const {
      formContext,
      disabled,
      readonly,
      id,
      onChange,
      value,
      schema,
      uiSchema
    } = props;
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('SimpleRCWidget rendered', {
        id,
        hasFormContext: !!formContext,
        hasOnCommand: !!formContext?.onCommand,
        connected: formContext?.connected,
        value,
        schema,
        uiSchema
      });
    }
    
    // Get connection status from formContext or use a default
    // The formContext should have connected state passed from DynamicFormRenderer
    const connected = formContext?.connected ?? false;
    const onCommand = formContext?.onCommand;
    
    if (!onCommand) {
      console.warn('SimpleRCWidget: onCommand not found in formContext', formContext);
      return (
        <div className="text-xs text-red-500">
          Error: Simple RC controls require onCommand in formContext
        </div>
      );
    }
    
    // Wrap onCommand to optionally update form data if needed
    // Simple RC controls don't store form data, but we'll call onChange with a string
    // to satisfy RJSF validation if needed
    const handleCommand = (command: string) => {
      onCommand(command);
      // Update form data with the command string to satisfy validation
      // Since the schema expects a string type, we'll store the command as a string
      if (onChange) {
        onChange(command);
      }
    };
    
    return (
      <div id={id}>
        <SimpleRCControls
          onCommand={handleCommand}
          connected={connected && !disabled && !readonly}
        />
      </div>
    );
  }
};
