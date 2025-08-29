import React from 'react';
import { useSelector } from 'react-redux';
import { selectSidebarOpen } from '../../store/slices/uiSlice';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumbs from './Breadcrumbs';

const DashboardLayout = ({ children }) => {
  const sidebarOpen = useSelector(selectSidebarOpen);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {/* Page header with breadcrumbs */}
          <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700/20 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Breadcrumbs />
            </div>
          </div>

          {/* Page content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-600 dark:bg-gray-900 opacity-75 dark:opacity-80" />
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
