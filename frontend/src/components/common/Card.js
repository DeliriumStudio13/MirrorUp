import React from 'react';
import classNames from 'classnames';

const Card = ({
  children,
  className = '',
  padding = true,
  shadow = true,
  hover = false,
  border = false
}) => {
  const cardClasses = classNames(
    'bg-white rounded-lg overflow-hidden',
    {
      'shadow-elevation-1': shadow,
      'shadow-float': hover,
      'border border-gray-200': border,
      'p-6': padding
    },
    className
  );

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};

const CardHeader = ({ 
  children, 
  className = '',
  title = null,
  subtitle = null,
  action = null
}) => {
  return (
    <div className={classNames('card-header', className)}>
      <div className="flex items-center justify-between">
        <div>
          {title && (
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
          {!title && !subtitle && children}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

const CardBody = ({ children, className = '' }) => {
  return (
    <div className={classNames('card-body', className)}>
      {children}
    </div>
  );
};

const CardFooter = ({ 
  children, 
  className = '',
  align = 'right' 
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  };

  return (
    <div className={classNames(
      'card-footer flex',
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  );
};

// Attach sub-components to main Card component
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
