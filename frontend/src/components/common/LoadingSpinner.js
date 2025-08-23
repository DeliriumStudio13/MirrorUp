import React from 'react';
import classNames from 'classnames';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  className = '',
  text = null,
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
    xlarge: 'h-12 w-12'
  };

  const colorClasses = {
    primary: 'border-primary-600',
    secondary: 'border-secondary-600',
    white: 'border-white',
    gray: 'border-gray-600'
  };

  const spinnerClasses = classNames(
    'animate-spin rounded-full border-2 border-t-transparent',
    sizeClasses[size],
    colorClasses[color],
    className
  );

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl'
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-4">
          <div className={spinnerClasses} />
          {text && (
            <p className={classNames('text-gray-600', textSizeClasses[size])}>
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className={spinnerClasses} />
      {text && (
        <span className={classNames('text-gray-600', textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
