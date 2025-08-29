import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { toggleTheme, selectIsDarkMode } from '../../store/slices/themeSlice';
import classNames from 'classnames';

const ThemeToggle = ({ className = '' }) => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector(selectIsDarkMode);

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  return (
    <button
      onClick={handleToggle}
      className={classNames(
        'relative inline-flex items-center justify-center p-2 rounded-lg transition-colors duration-200',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
        className
      )}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        {/* Sun Icon - visible in dark mode */}
        <SunIcon 
          className={classNames(
            'absolute inset-0 w-5 h-5 transition-all duration-300 transform',
            isDarkMode 
              ? 'opacity-100 scale-100 rotate-0' 
              : 'opacity-0 scale-75 rotate-90'
          )} 
        />
        
        {/* Moon Icon - visible in light mode */}
        <MoonIcon 
          className={classNames(
            'absolute inset-0 w-5 h-5 transition-all duration-300 transform',
            !isDarkMode 
              ? 'opacity-100 scale-100 rotate-0' 
              : 'opacity-0 scale-75 -rotate-90'
          )} 
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
