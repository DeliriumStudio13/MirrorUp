import React from 'react';
import classNames from 'classnames';

const Badge = ({
  children,
  variant = 'primary',
  size = 'medium',
  rounded = true,
  className = '',
  icon: Icon = null,
  dot = false,
  removable = false,
  onRemove = null
}) => {
  const baseClasses = 'badge inline-flex items-center font-medium';
  
  const variantClasses = {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    gray: 'bg-gray-100 text-gray-800'
  };

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-0.5 text-xs', // Default
    large: 'px-3 py-1 text-sm'
  };

  const badgeClasses = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    {
      'rounded-full': rounded,
      'rounded': !rounded
    },
    className
  );

  const iconSize = {
    small: 'h-3 w-3',
    medium: 'h-3 w-3',
    large: 'h-4 w-4'
  };

  const dotSize = {
    small: 'h-1.5 w-1.5',
    medium: 'h-2 w-2',
    large: 'h-2.5 w-2.5'
  };

  return (
    <span className={badgeClasses}>
      {dot && (
        <span className={classNames(
          'rounded-full bg-current mr-1.5',
          dotSize[size]
        )} />
      )}
      
      {Icon && (
        <Icon className={classNames(
          iconSize[size],
          children ? 'mr-1' : ''
        )} />
      )}
      
      {children}
      
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-current hover:bg-current hover:bg-opacity-20 focus:outline-none focus:bg-current focus:bg-opacity-20 transition-colors"
        >
          <span className="sr-only">Remove badge</span>
          <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
            <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6L1 7" />
          </svg>
        </button>
      )}
    </span>
  );
};

// Status badge variants for common use cases
const StatusBadge = ({ status, ...props }) => {
  const statusConfig = {
    active: { variant: 'success', children: 'Active', dot: true },
    inactive: { variant: 'gray', children: 'Inactive', dot: true },
    pending: { variant: 'warning', children: 'Pending', dot: true },
    completed: { variant: 'success', children: 'Completed', dot: true },
    cancelled: { variant: 'danger', children: 'Cancelled', dot: true },
    draft: { variant: 'gray', children: 'Draft', dot: true },
    'under-review': { variant: 'warning', children: 'Under Review', dot: true },
    approved: { variant: 'success', children: 'Approved', dot: true },
    rejected: { variant: 'danger', children: 'Rejected', dot: true },
    overdue: { variant: 'danger', children: 'Overdue', dot: true }
  };

  const config = statusConfig[status] || { variant: 'gray', children: status };
  
  return <Badge {...config} {...props} />;
};

// Role badge for user roles
const RoleBadge = ({ role, ...props }) => {
  const roleConfig = {
    admin: { variant: 'danger', children: 'Admin' },
    hr: { variant: 'primary', children: 'HR' },
    manager: { variant: 'warning', children: 'Manager' },
    employee: { variant: 'secondary', children: 'Employee' }
  };

  const config = roleConfig[role] || { variant: 'gray', children: role };
  
  return <Badge {...config} {...props} />;
};

Badge.Status = StatusBadge;
Badge.Role = RoleBadge;

export default Badge;
