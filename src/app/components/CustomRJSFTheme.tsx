import React from 'react';
import { FieldTemplateProps, ObjectFieldTemplateProps, TitleFieldProps, BaseInputTemplateProps, ButtonTemplates } from '@rjsf/utils';

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

  return (
    <div className={`field-wrapper ${classNames}`} style={style}>
      {displayLabel && label && (
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
    canAdd
  } = props;

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
      {canAdd && (
        <button
          type="button"
          className="add-button"
          onClick={onAddClick}
          disabled={disabled || readonly}
        >
          Add Item
        </button>
      )}
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
export const CustomButtonTemplates: ButtonTemplates = {
  SubmitButton: (props) => (
    <button
      type="submit"
      className="submit-button"
      disabled={props.disabled}
    >
      {props.children || 'Submit'}
    </button>
  ),
  AddButton: (props) => (
    <button
      type="button"
      className="add-button"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children || 'Add'}
    </button>
  ),
  RemoveButton: (props) => (
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
  TextWidget: (props: any) => (
    <input
      {...props}
      className="text-widget"
      type="text"
    />
  ),
  TextareaWidget: (props: any) => (
    <textarea
      {...props}
      className="textarea-widget"
      rows={props.uiSchema?.['ui:options']?.rows || 3}
    />
  ),
  SelectWidget: (props: any) => (
    <select
      {...props}
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
    <div className="range-widget">
      <input
        {...props}
        type="range"
        className="range-input"
        min={props.schema.minimum}
        max={props.schema.maximum}
        step={props.schema.multipleOf || 1}
      />
      <div className="range-value">{props.value}</div>
    </div>
  )
};
