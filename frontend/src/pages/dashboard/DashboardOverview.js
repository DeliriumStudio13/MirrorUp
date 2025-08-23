import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

// Redux
import { selectUser, selectBusinessData } from '../../store/slices/authSlice';
import { setBreadcrumbs } from '../../store/slices/uiSlice';

// Components
import { Card, Badge } from '../../components/common';

// Icons
import {
  UsersIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

const DashboardOverview = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const businessData = useSelector(selectBusinessData);

  // Set breadcrumbs
  useEffect(() => {
    dispatch(setBreadcrumbs([])); // Clear breadcrumbs for dashboard
  }, [dispatch]);

  // Mock data for demonstration - In real app, this would come from Firebase
  const stats = {
    totalEmployees: 45,
    totalDepartments: 8,
    activeEvaluations: 12,
    completedEvaluations: 33,
    overdueEvaluations: 3
  };

  const recentEvaluations = [
    {
      id: '1',
      employee: 'John Doe',
      status: 'completed',
      score: 85,
      completedAt: '2024-01-15'
    },
    {
      id: '2',
      employee: 'Jane Smith',
      status: 'under-review',
      score: null,
      dueDate: '2024-01-20'
    },
    {
      id: '3',
      employee: 'Mike Johnson',
      status: 'overdue',
      score: null,
      dueDate: '2024-01-10'
    }
  ];

  const quickActions = [
    {
      name: 'Add Employee',
      href: '/users/create',
      icon: UsersIcon,
      color: 'bg-blue-500',
      available: ['admin', 'hr'].includes(user?.role)
    },
    {
      name: 'Create Evaluation',
      href: '/evaluations/create',
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-500',
      available: ['admin', 'hr', 'manager'].includes(user?.role)
    },
    {
      name: 'View Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      available: ['admin', 'hr', 'manager'].includes(user?.role)
    },
    {
      name: 'Manage Departments',
      href: '/departments',
      icon: BuildingOfficeIcon,
      color: 'bg-orange-500',
      available: ['admin', 'hr'].includes(user?.role)
    }
  ].filter(action => action.available);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.profile?.firstName}!
          </h1>
          <p className="text-gray-600">
            Welcome to your {businessData?.name} dashboard
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalEmployees}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Departments</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalDepartments}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClipboardDocumentListIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Evaluations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeEvaluations}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completedEvaluations}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.overdueEvaluations}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <Card.Header title="Quick Actions" />
            <Card.Body>
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.name}
                    to={action.href}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`flex-shrink-0 p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600">
                        {action.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Recent Evaluations */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header 
              title="Recent Evaluations" 
              action={
                <Link 
                  to="/evaluations" 
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  View all
                </Link>
              }
            />
            <Card.Body>
              {recentEvaluations.length > 0 ? (
                <div className="space-y-4">
                  {recentEvaluations.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {evaluation.employee.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {evaluation.employee}
                          </p>
                          <div className="flex items-center text-sm text-gray-500">
                            {evaluation.status === 'completed' ? (
                              <>
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Completed on {new Date(evaluation.completedAt).toLocaleDateString()}
                              </>
                            ) : (
                              <>
                                <ClockIcon className="h-4 w-4 mr-1" />
                                Due {new Date(evaluation.dueDate).toLocaleDateString()}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {evaluation.score && (
                          <div className="flex items-center">
                            <TrophyIcon className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="text-sm font-medium text-gray-900">
                              {evaluation.score}%
                            </span>
                          </div>
                        )}
                        <Badge.Status status={evaluation.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No evaluations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first evaluation.
                  </p>
                  <div className="mt-3">
                    <Link
                      to="/evaluations/create"
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Create Evaluation
                    </Link>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
