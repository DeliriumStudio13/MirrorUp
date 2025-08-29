import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import classNames from 'classnames';

// Utils
import { formatDate } from '../../utils/dateUtils';

// Redux
import { logout, selectUser, selectBusinessData } from '../../store/slices/authSlice';
import { toggleSidebar, selectNotifications, selectUnreadNotifications } from '../../store/slices/uiSlice';

// Components
import { Badge } from '../../components/common';
import ThemeToggle from '../../components/common/ThemeToggle';

// Icons
import {
  Bars3Icon,
  BellIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const businessData = useSelector(selectBusinessData);
  const notifications = useSelector(selectNotifications);
  const unreadNotifications = useSelector(selectUnreadNotifications);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMobileMenuToggle = () => {
    dispatch(toggleSidebar());
  };



  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-700/20 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left section */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden -ml-2 mr-2 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={handleMobileMenuToggle}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>


          </div>

          {/* Right section */}
          <div className="ml-4 flex items-center md:ml-6">
            {/* Business name */}
            <div className="hidden md:block mr-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {businessData?.name}
              </span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle className="mr-3" />

            {/* Notifications */}
            <Menu as="div" className="relative">
              <div>
                <Menu.Button className="bg-white dark:bg-gray-900 p-1 rounded-full text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:ring-offset-gray-900 focus:ring-primary-500">
                  <span className="sr-only">View notifications</span>
                  <div className="relative">
                    <BellIcon className="h-6 w-6" aria-hidden="true" />
                    {unreadNotifications.length > 0 && (
                      <Badge
                        variant="danger"
                        size="small"
                        className="absolute -top-1 -right-1 h-4 w-4 text-xs flex items-center justify-center"
                      >
                        {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                      </Badge>
                    )}
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg dark:shadow-gray-700/20 py-1 bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 focus:outline-none z-10">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Notifications</h3>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.slice(0, 5).map((notification) => (
                        <Menu.Item key={notification.id}>
                          {({ active }) => (
                            <div
                              className={classNames(
                                active ? 'bg-gray-50 dark:bg-gray-700' : '',
                                'px-4 py-3 text-sm cursor-pointer',
                                !notification.read ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                              )}
                            >
                              <div className="font-medium text-gray-900 dark:text-white">
                                {notification.title}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400 mt-1">
                                {notification.message}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {formatDate(notification.timestamp)}
                              </div>
                            </div>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No notifications
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/notifications"
                          className={classNames(
                            active ? 'bg-gray-50 dark:bg-gray-700' : '',
                            'block px-4 py-2 text-sm text-center text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300'
                          )}
                        >
                          View all notifications
                        </Link>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            {/* Profile dropdown */}
            <Menu as="div" className="ml-3 relative">
              <div>
                <Menu.Button className="max-w-xs bg-white dark:bg-gray-900 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 dark:ring-offset-gray-900 focus:ring-primary-500">
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.profile?.firstName?.charAt(0)}{user?.profile?.lastName?.charAt(0)}
                    </span>
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg dark:shadow-gray-700/20 py-1 bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 focus:outline-none z-10">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.profile?.firstName} {user?.profile?.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </div>
                    <Badge.Role role={user?.role} size="small" className="mt-1" />
                  </div>



                  {(['admin', 'hr'].includes(user?.role)) && (
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/settings"
                          className={classNames(
                            active ? 'bg-gray-100 dark:bg-gray-700' : '',
                            'flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                          )}
                        >
                          <CogIcon className="mr-3 h-5 w-5 text-gray-400" />
                          Settings
                        </Link>
                      )}
                    </Menu.Item>
                  )}

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={classNames(
                          active ? 'bg-gray-100 dark:bg-gray-700' : '',
                          'flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
