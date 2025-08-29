import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import classNames from 'classnames';
import { selectBreadcrumbs } from '../../store/slices/uiSlice';

const Breadcrumbs = () => {
  const location = useLocation();
  const customBreadcrumbs = useSelector(selectBreadcrumbs);

  // Generate breadcrumbs from URL if no custom breadcrumbs are set
  const generateBreadcrumbs = () => {
    if (customBreadcrumbs.length > 0) {
      return customBreadcrumbs;
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Always add dashboard as the first breadcrumb
    if (location.pathname !== '/dashboard') {
      breadcrumbs.push({
        name: 'Dashboard',
        href: '/dashboard',
        current: false
      });
    }

    // Generate breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip dashboard since it's already added
      if (segment === 'dashboard') return;

      const isLast = index === pathSegments.length - 1;
      const name = formatSegmentName(segment);

      breadcrumbs.push({
        name,
        href: currentPath,
        current: isLast
      });
    });

    return breadcrumbs;
  };

  // Format URL segment into readable name
  const formatSegmentName = (segment) => {
    // Handle common segments
    const segmentNames = {
      'users': 'Users',
      'departments': 'Departments',
      'evaluations': 'Evaluations',
      'org-chart': 'Organization Chart',
      'bonus': 'Bonus Management',
      'settings': 'Settings',
      'profile': 'Profile',
      'analytics': 'Analytics',
      'create': 'Create',
      'edit': 'Edit'
    };

    if (segmentNames[segment]) {
      return segmentNames[segment];
    }

    // Handle IDs (usually long strings)
    if (segment.length > 10) {
      return 'Details';
    }

    // Default formatting: capitalize and replace hyphens
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex py-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-4">
        {/* Home icon for dashboard */}
        {location.pathname !== '/dashboard' && (
          <li>
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
              >
                <HomeIcon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Dashboard</span>
              </Link>
            </div>
          </li>
        )}

        {breadcrumbs.map((item, index) => (
          <li key={item.href}>
            <div className="flex items-center">
              {/* Show chevron separator except for first item when on dashboard */}
              {(index > 0 || location.pathname !== '/dashboard') && (
                <ChevronRightIcon
                  className="flex-shrink-0 h-5 w-5 text-gray-300 dark:text-gray-600 mr-4"
                  aria-hidden="true"
                />
              )}
              
              {item.current ? (
                <span className="ml-4 text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className={classNames(
                    'ml-4 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 truncate',
                    location.pathname === '/dashboard' && index === 0 ? 'ml-0' : ''
                  )}
                >
                  {item.name}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
