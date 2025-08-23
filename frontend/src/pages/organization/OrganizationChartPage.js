import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  BuildingOffice2Icon,
  UserGroupIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Card, Button, LoadingSpinner } from '../../components/common';
import { fetchUsers, selectUsers, selectUsersLoading } from '../../store/slices/userSlice';
import { fetchDepartments, selectDepartments } from '../../store/slices/departmentSlice';
import { selectUser } from '../../store/slices/authSlice';

const OrganizationChartPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);
  const users = useSelector(selectUsers);
  const departments = useSelector(selectDepartments);
  const loading = useSelector(selectUsersLoading);
  const [expandedDepartments, setExpandedDepartments] = useState(new Set());

  // Fetch data on component mount
  useEffect(() => {
    if (currentUser?.businessId) {
      dispatch(fetchUsers(currentUser.businessId));
      dispatch(fetchDepartments(currentUser.businessId));
    }
  }, [dispatch, currentUser?.businessId]);

  // Toggle department expansion
  const toggleDepartment = (departmentId) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(departmentId)) {
      newExpanded.delete(departmentId);
    } else {
      newExpanded.add(departmentId);
    }
    setExpandedDepartments(newExpanded);
  };

  // Get users by department
  const getUsersByDepartment = (departmentId) => {
    return users.filter(user => user.employeeInfo.department === departmentId);
  };

  // Get users by role within a department
  const getUsersByRole = (departmentUsers, role) => {
    return departmentUsers.filter(user => user.role === role);
  };

  // Get role icon and color
  const getRoleDisplay = (role) => {
    switch (role) {
      case 'admin':
        return { icon: '🔑', label: 'Admin', color: 'text-red-600 bg-red-50' };
      case 'hr':
        return { icon: '🏢', label: 'HR', color: 'text-blue-600 bg-blue-50' };
      case 'manager':
        return { icon: '👥', label: 'Manager', color: 'text-green-600 bg-green-50' };
      case 'supervisor':
        return { icon: '👷', label: 'Supervisor', color: 'text-yellow-600 bg-yellow-50' };
      case 'employee':
        return { icon: '👤', label: 'Employee', color: 'text-gray-600 bg-gray-50' };
      default:
        return { icon: '👤', label: 'Employee', color: 'text-gray-600 bg-gray-50' };
    }
  };

  // Render user card
  const UserCard = ({ user }) => {
    const roleDisplay = getRoleDisplay(user.role);
    
    return (
      <div className={`p-3 rounded-lg border-2 ${roleDisplay.color} border-dashed transition-all hover:shadow-md`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-lg">{roleDisplay.icon}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900">
              {user.profile.firstName} {user.profile.lastName}
            </div>
            <div className="text-xs text-gray-500">{user.employeeInfo.position}</div>
            <div className="text-xs text-gray-400">{user.employeeInfo.employeeId}</div>
          </div>
          <div className="flex-shrink-0">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${roleDisplay.color}`}>
              {roleDisplay.label}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Get child departments
  const getChildDepartments = (parentId) => {
    return departments.filter(dept => dept.parentDepartment === parentId);
  };

  // Get root departments (no parent)
  const getRootDepartments = () => {
    return departments.filter(dept => !dept.parentDepartment);
  };

  // Render department tree
  const DepartmentTree = ({ department, level = 0 }) => {
    const isExpanded = expandedDepartments.has(department.id);
    const departmentUsers = getUsersByDepartment(department.id);
    const childDepartments = getChildDepartments(department.id);
    
    // Organize users by hierarchy
    const managers = getUsersByRole(departmentUsers, 'manager');
    const supervisors = getUsersByRole(departmentUsers, 'supervisor');
    const employees = getUsersByRole(departmentUsers, 'employee');
    const hr = getUsersByRole(departmentUsers, 'hr');
    const admins = getUsersByRole(departmentUsers, 'admin');

    return (
      <div className={`border rounded-lg bg-white shadow-sm ${level > 0 ? 'ml-8 mt-4 border-l-4 border-l-blue-300' : ''}`}>
        {/* Department Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleDepartment(department.id)}
        >
          <div className="flex items-center space-x-3">
            <BuildingOffice2Icon className={`w-6 h-6 ${level > 0 ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <div className="flex items-center space-x-2">
                {level > 0 && <span className="text-gray-400 text-sm">└─</span>}
                <h3 className={`font-semibold ${level === 0 ? 'text-lg' : 'text-md'} text-gray-900`}>
                  {department.name}
                </h3>
                {level > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Sub-department
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {departmentUsers.length} employee{departmentUsers.length !== 1 ? 's' : ''}
                {childDepartments.length > 0 && (
                  <span className="ml-2">• {childDepartments.length} sub-department{childDepartments.length !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              department.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {department.isActive ? 'Active' : 'Inactive'}
            </span>
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Department Content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t bg-gray-50">
            <div className="pt-4">
              {/* Department Description */}
              {department.description && (
                <p className="text-sm text-gray-600 mb-4">{department.description}</p>
              )}

              {/* Hierarchy Display */}
              <div className="space-y-6">
                {/* Admins */}
                {admins.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                      <span className="mr-2">🔑</span>
                      Administrators ({admins.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {admins.map(user => <UserCard key={user.id} user={user} />)}
                    </div>
                  </div>
                )}

                {/* HR */}
                {hr.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                      <span className="mr-2">🏢</span>
                      Human Resources ({hr.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {hr.map(user => <UserCard key={user.id} user={user} />)}
                    </div>
                  </div>
                )}

                {/* Managers */}
                {managers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                      <span className="mr-2">👥</span>
                      Managers ({managers.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {managers.map(user => <UserCard key={user.id} user={user} />)}
                    </div>
                  </div>
                )}

                {/* Supervisors */}
                {supervisors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center">
                      <span className="mr-2">👷</span>
                      Supervisors ({supervisors.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {supervisors.map(user => <UserCard key={user.id} user={user} />)}
                    </div>
                  </div>
                )}

                {/* Employees */}
                {employees.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <span className="mr-2">👤</span>
                      Employees ({employees.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {employees.map(user => <UserCard key={user.id} user={user} />)}
                    </div>
                  </div>
                )}

                {/* No employees message */}
                {departmentUsers.length === 0 && childDepartments.length === 0 && (
                  <div className="text-center py-8">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This department doesn't have any employees assigned yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Child Departments */}
        {isExpanded && childDepartments.length > 0 && (
          <div className="border-t bg-gray-50">
            <div className="p-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2 px-2">Sub-departments:</h4>
              {childDepartments.map(childDept => (
                <DepartmentTree key={childDept.id} department={childDept} level={level + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading && departments.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Chart</h1>
          <p className="text-gray-600">
            Visual representation of your company's structure and hierarchy
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={() => setExpandedDepartments(new Set(departments.map(d => d.id)))}
            variant="ghost"
          >
            Expand All
          </Button>
          <Button 
            onClick={() => setExpandedDepartments(new Set())}
            variant="ghost"
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Organization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOffice2Icon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Departments</div>
              <div className="text-2xl font-bold text-gray-900">{departments.length}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Employees</div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded bg-green-100 flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Managers</div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'manager').length}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded bg-yellow-100 flex items-center justify-center">
                <span className="text-lg">👷</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Supervisors</div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'supervisor').length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Department Trees - Only show root departments */}
      <div className="space-y-4">
        {getRootDepartments().map(department => (
          <DepartmentTree key={department.id} department={department} level={0} />
        ))}
      </div>

      {/* Empty State */}
      {departments.length === 0 && (
        <Card className="text-center py-12">
          <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No departments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first department.
          </p>
          <div className="mt-6">
            <Button className="btn-primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Department
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OrganizationChartPage;
