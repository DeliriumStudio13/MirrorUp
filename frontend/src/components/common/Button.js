import React from 'react';
import classNames from 'classnames';
import LoadingSpinner from './LoadingSpinner';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  icon: Icon = null,
  iconPosition = 'left',
  onClick = null,
  ...props
}) => {
  const baseClasses = 'btn transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
    danger: 'btn-danger',
    outline: 'btn-outline',
    ghost: 'btn-ghost'
  };

  const sizeClasses = {
    small: 'btn-sm',
    medium: '', // Default size
    large: 'btn-lg'
  };

  const buttonClasses = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    {
      'w-full': fullWidth,
      'opacity-50 cursor-not-allowed': disabled || loading,
      'cursor-wait': loading
    },
    className
  );

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  const iconSize = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6'
  };

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <LoadingSpinner size="small" color="white" />
          <span>Loading...</span>
        </>
      );
    }

    if (Icon && iconPosition === 'left') {
      return (
        <>
          <Icon className={classNames(iconSize[size], 'mr-2')} />
          {children}
        </>
      );
    }

    if (Icon && iconPosition === 'right') {
      return (
        <>
          {children}
          <Icon className={classNames(iconSize[size], 'ml-2')} />
        </>
      );
    }

    return children;
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
