import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import classNames from 'classnames';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { selectSidebarOpen, setSidebarOpen } from '../../store/slices/uiSlice';

// Icons
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CogIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  StarIcon,
  TrophyIcon,
  AcademicCapIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector(selectUser);
  const sidebarOpen = useSelector(selectSidebarOpen);

  const closeSidebar = () => {
    dispatch(setSidebarOpen(false));
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        current: location.pathname === '/dashboard'
      }
    ];

    // Admin & HR Items (Full System Access)
    const systemManagementItems = [
      {
        name: 'Users',
        href: '/users',
        icon: UsersIcon,
        current: location.pathname.startsWith('/users')
      },
      {
        name: 'Departments',
        href: '/departments',
        icon: BuildingOfficeIcon,
        current: location.pathname.startsWith('/departments')
      },
      {
        name: 'Organization Chart',
        href: '/organization-chart',
        icon: UserGroupIcon,
        current: location.pathname === '/organization-chart'
      }
    ];

    const templateManagementItems = [
      {
        name: 'Evaluation Templates',
        href: '/evaluation-templates',
        icon: ClipboardDocumentListIcon,
        current: location.pathname.startsWith('/evaluation-templates')
      }
    ];

    // Manager Items (Evaluating Others + Being Evaluated)
    const managerEvaluationItems = [
      {
        name: 'My Team',
        href: '/my-team',
        icon: UserGroupIcon,
        current: location.pathname.startsWith('/my-team')
      },
      {
        name: 'Assign Evaluations',
        href: '/assign-evaluations',
        icon: PlusIcon,
        current: location.pathname.startsWith('/assign-evaluations')
      },
      {
        name: 'Review Evaluations',
        href: '/review-evaluations',
        icon: DocumentCheckIcon,
        current: location.pathname.startsWith('/review-evaluations')
      },
      {
        name: 'My Evaluations',
        href: '/my-evaluations',
        icon: StarIcon,
        current: location.pathname.startsWith('/my-evaluations')
      }
    ];

    // Supervisor Items (Similar to Manager but Smaller Scope)
    const supervisorEvaluationItems = [
      {
        name: 'My Team',
        href: '/my-team',
        icon: UserGroupIcon,
        current: location.pathname.startsWith('/my-team')
      },
      {
        name: 'Assign Evaluations',
        href: '/assign-evaluations',
        icon: PlusIcon,
        current: location.pathname.startsWith('/assign-evaluations')
      },
      {
        name: 'Review Evaluations',
        href: '/review-evaluations',
        icon: DocumentCheckIcon,
        current: location.pathname.startsWith('/review-evaluations')
      },
      {
        name: 'My Evaluations',
        href: '/my-evaluations',
        icon: StarIcon,
        current: location.pathname.startsWith('/my-evaluations')
      }
    ];

    // Employee Items (Individual Focus)
    const employeeEvaluationItems = [
      {
        name: 'My Evaluations',
        href: '/my-evaluations',
        icon: StarIcon,
        current: location.pathname.startsWith('/my-evaluations')
      },
      {
        name: 'Pending Tasks',
        href: '/pending-evaluations',
        icon: ClockIcon,
        current: location.pathname.startsWith('/pending-evaluations')
      },
      {
        name: 'My Goals & Targets',
        href: '/my-goals',
        icon: TrophyIcon,
        current: location.pathname.startsWith('/my-goals')
      },
      {
        name: 'Performance History',
        href: '/performance-history',
        icon: AcademicCapIcon,
        current: location.pathname.startsWith('/performance-history')
      }
    ];

    const reportItems = [
      {
        name: 'Team Performance',
        href: '/team-performance',
        icon: ChartBarIcon,
        current: location.pathname.startsWith('/team-performance')
      }
    ];

    const systemReportItems = [
      {
        name: 'System Analytics',
        href: '/analytics',
        icon: ChartBarIcon,
        current: location.pathname.startsWith('/analytics')
      }
    ];

    const bonusItems = [
      {
        name: 'Bonus Management',
        href: '/bonus',
        icon: CurrencyDollarIcon,
        current: location.pathname.startsWith('/bonus')
      }
    ];

    const bonusAllocationItems = [
      {
        name: 'Bonus Allocation',
        href: '/bonus-allocation',
        icon: CurrencyDollarIcon,
        current: location.pathname.startsWith('/bonus-allocation')
      }
    ];

    const settingsItems = [
      {
        name: 'Settings',
        href: '/settings',
        icon: CogIcon,
        current: location.pathname.startsWith('/settings')
      }
    ];

    // Combine items based on user role
    let items = [...baseItems];

    if (user?.role === 'admin') {
      // Admin has full system access
      items = [
        ...items, 
        ...systemManagementItems, 
        ...templateManagementItems, 
        ...systemReportItems, 
        ...bonusItems, 
        ...settingsItems
      ];
    } else if (user?.role === 'hr') {
      // HR has system management but limited settings
      items = [
        ...items, 
        ...systemManagementItems, 
        ...templateManagementItems, 
        ...systemReportItems, 
        ...bonusItems
      ];
    } else if (user?.role === 'manager') {
      // Manager has dual role: evaluate others + be evaluated
      items = [
        ...items, 
        ...managerEvaluationItems, 
        ...reportItems
      ];
      
      // Add bonus allocation for head managers only
      if (user?.isHeadManager === true) {
        items = [...items, ...bonusAllocationItems];
      }
    } else if (user?.role === 'head-manager') {
      // Head Manager has all manager privileges plus bonus allocation
      items = [
        ...items, 
        ...managerEvaluationItems, 
        ...reportItems,
        ...bonusAllocationItems
      ];
    } else if (user?.role === 'supervisor') {
      // Supervisor has dual role: evaluate employees + be evaluated by manager
      items = [
        ...items, 
        ...supervisorEvaluationItems, 
        ...reportItems
      ];
    } else {
      // Employee: individual focus
      items = [...items, ...employeeEvaluationItems];
    }

    return items;
  };

  const navigation = getNavigationItems();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={classNames(
        'hidden lg:flex lg:flex-shrink-0',
        'transition-all duration-300 ease-in-out'
      )}>
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          {/* Sidebar header */}
          <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-primary-600">
            <Link to="/dashboard" className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-lg">E</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-white font-semibold text-lg">EvalSys</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="mt-5 flex-1 px-2 bg-white space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={classNames(
                  item.current
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200'
                )}
              >
                <item.icon
                  className={classNames(
                    item.current
                      ? 'text-primary-500'
                      : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 flex-shrink-0 h-6 w-6 transition-colors duration-200'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Link to="/profile" className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  <div className="inline-block h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.profile?.firstName?.charAt(0)}{user?.profile?.lastName?.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={classNames(
        'fixed inset-0 flex z-40 lg:hidden',
        sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
      )}>
        <div className={classNames(
          'fixed inset-0 bg-gray-600 bg-opacity-75',
          sidebarOpen ? 'opacity-100' : 'opacity-0',
          'transition-opacity ease-linear duration-300'
        )} onClick={closeSidebar} />

        <div className={classNames(
          'relative flex-1 flex flex-col max-w-xs w-full bg-white',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'transition-transform ease-in-out duration-300'
        )}>
          {/* Close button */}
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className={classNames(
                'ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white',
                sidebarOpen ? 'opacity-100' : 'opacity-0',
                'transition-opacity ease-linear duration-300'
              )}
              onClick={closeSidebar}
            >
              <span className="sr-only">Close sidebar</span>
              <svg
                className="h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Mobile sidebar content */}
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            {/* Mobile sidebar header */}
            <div className="flex items-center justify-center flex-shrink-0 px-4 mb-5">
              <Link to="/dashboard" className="flex items-center" onClick={closeSidebar}>
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">E</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-primary-600 font-semibold text-lg">EvalSys</p>
                </div>
              </Link>
            </div>

            {/* Mobile navigation */}
            <nav className="px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeSidebar}
                  className={classNames(
                    item.current
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={classNames(
                      item.current
                        ? 'text-primary-500'
                        : 'text-gray-400 group-hover:text-gray-500',
                      'mr-4 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Mobile user info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Link 
              to="/profile" 
              className="flex-shrink-0 group block w-full"
              onClick={closeSidebar}
            >
              <div className="flex items-center">
                <div>
                  <div className="inline-block h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.profile?.firstName?.charAt(0)}{user?.profile?.lastName?.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </p>
                  <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
