import React, { forwardRef } from 'react';
import classNames from 'classnames';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const TextArea = forwardRef(({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  name,
  id,
  required = false,
  disabled = false,
  error = null,
  helperText = null,
  rows = 4,
  resize = true,
  maxLength = null,
  showCharCount = false,
  className = '',
  textAreaClassName = '',
  ...props
}, ref) => {
  const inputId = id || name || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const textAreaClasses = classNames(
    'input',
    {
      'input-error': error,
      'cursor-not-allowed bg-gray-50 dark:bg-gray-800': disabled,
      'resize-none': !resize,
      'resize-y': resize
    },
    textAreaClassName
  );

  const wrapperClasses = classNames(className);

  const currentLength = value ? value.length : 0;
  const showCount = showCharCount && (maxLength || currentLength > 0);

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={ref}
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={textAreaClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        
        {error && (
          <div className="absolute top-3 right-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-start mt-1">
        <div className="flex-1">
          {error && (
            <p id={`${inputId}-error`} className="text-sm text-red-600">
              {error}
            </p>
          )}
          
          {helperText && !error && (
            <p id={`${inputId}-helper`} className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
        
        {showCount && (
          <div className="text-sm text-gray-500 ml-2 flex-shrink-0">
            {currentLength}
            {maxLength && (
              <>
                <span className="text-gray-300"> / </span>
                <span className={classNames(
                  currentLength >= maxLength ? 'text-red-500' : 'text-gray-500'
                )}>
                  {maxLength}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default TextArea;
