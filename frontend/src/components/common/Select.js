import React, { forwardRef } from 'react';
import classNames from 'classnames';
import { ChevronDownIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const Select = forwardRef(({
  label,
  value,
  onChange,
  onBlur,
  name,
  id,
  required = false,
  disabled = false,
  error = null,
  helperText = null,
  placeholder = 'Select an option',
  options = [],
  className = '',
  selectClassName = '',
  ...props
}, ref) => {
  const inputId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const selectClasses = classNames(
    'input pr-10 appearance-none cursor-pointer',
    {
      'input-error': error,
      'cursor-not-allowed bg-gray-50 dark:bg-gray-800': disabled
    },
    selectClassName
  );

  const wrapperClasses = classNames(className);

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          className={selectClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => {
            // Handle both string array and object array
            if (typeof option === 'string') {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            }
            
            return (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            );
          })}
        </select>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {error ? (
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>
      
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
