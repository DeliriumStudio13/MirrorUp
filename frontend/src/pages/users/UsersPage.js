import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { Card, Button, Input, Modal, Select, Badge, LoadingSpinner } from '../../components/common';
import { 
  fetchUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  selectUsers, 
  selectUsersLoading, 
  selectUsersError 
} from '../../store/slices/userSlice';
import { selectUser, selectBusinessData } from '../../store/slices/authSlice';
import { fetchDepartments, selectDepartments } from '../../store/slices/departmentSlice';

const UsersPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);
  const businessData = useSelector(selectBusinessData);
  const users = useSelector(selectUsers);
  const loading = useSelector(selectUsersLoading);
  const error = useSelector(selectUsersError);
  const departments = useSelector(selectDepartments);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch users and departments on component mount
  useEffect(() => {
    if (currentUser?.businessId) {
      dispatch(fetchUsers(currentUser.businessId));
      dispatch(fetchDepartments(currentUser.businessId));
    }
  }, [dispatch, currentUser?.businessId]);

  // Refresh departments when add modal opens
  useEffect(() => {
    if (isAddModalOpen && currentUser?.businessId) {
      dispatch(fetchDepartments(currentUser.businessId));
    }
  }, [isAddModalOpen, dispatch, currentUser?.businessId]);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.employeeInfo.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesDepartment = selectedDepartment === 'all' || user.employeeInfo.department === selectedDepartment;
    
    return matchesSearch && matchesRole && matchesDepartment;
  });

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsAddModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await dispatch(deleteUser({ userId, businessId: currentUser.businessId })).unwrap();
      } catch (error) {
        alert('Failed to delete user: ' + error);
      }
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-blue-100 text-blue-800';
      case 'head-manager': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-green-100 text-green-800';
      case 'supervisor': return 'bg-yellow-100 text-yellow-800';
      case 'employee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && users.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage employees and their roles in {businessData?.name}</p>
        </div>
        <Button 
          onClick={handleAddUser}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlusIcon className="w-5 h-5" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="head-manager">Head Manager</option>
            <option value="manager">Manager</option>
            <option value="supervisor">Supervisor</option>
            <option value="employee">Employee</option>
          </Select>
          <Select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments && departments.length > 0 ? 
              departments.filter(dept => dept && dept.isActive !== false).map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              )) : 
              <option disabled>Loading departments...</option>
            }
          </Select>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const department = departments.find(d => d.id === user.employeeInfo.department);
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.profile.firstName[0]}{user.profile.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.profile.firstName} {user.profile.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.profile.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.employeeInfo.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {department?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.employeeInfo.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditUser(user)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        {user.id !== currentUser.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedRole !== 'all' || selectedDepartment !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by adding your first employee.'
                }
              </p>
              {(!searchTerm && selectedRole === 'all' && selectedDepartment === 'all') && (
                <div className="mt-6">
                  <Button onClick={handleAddUser} className="btn-primary">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add User
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <AddUserModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          departments={departments}
          businessId={currentUser.businessId}
          users={users}
        />
      )}
      
      {/* Debug: Show departments count */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', top: '10px', right: '10px', background: 'white', padding: '10px', border: '1px solid #ccc', zIndex: 9999 }}>
          Departments: {departments.length}
          <br />
          {departments.map(d => `${d.name} (${d.isActive})`).join(', ')}
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={selectedUser}
          departments={departments}
          businessId={currentUser.businessId}
          users={users}
        />
      )}
    </div>
  );
};

// Add User Modal Component
const AddUserModal = ({ isOpen, onClose, departments, businessId, users }) => {
  const dispatch = useDispatch();
  
  // Fetch departments when modal opens
  useEffect(() => {
    if (isOpen && businessId) {
      dispatch(fetchDepartments(businessId));
    }
  }, [isOpen, businessId, dispatch]);
  
  // Debug departments in modal
  useEffect(() => {
    console.log('AddUserModal departments:', departments);
  }, [departments]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    position: '',
    phone: '',
    hireDate: new Date().toISOString().split('T')[0],
    managerId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await dispatch(createUser({
        userData: formData,
        businessId
      })).unwrap();
      
      onClose();
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'employee',
        department: '',
        position: '',
        phone: '',
        hireDate: new Date().toISOString().split('T')[0],
        managerId: ''
      });
    } catch (error) {
      alert('Failed to create user: ' + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
          <Input
            label="Last Name"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />

                  <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
            minLength={6}
          />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Role <span className="text-red-500">*</span></label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              required
            >
              <option value="">Select Role</option>
              <option value="employee">👤 Employee</option>
              <option value="supervisor">👷 Supervisor</option>
              <option value="manager">👥 Manager</option>
              <option value="head-manager">👑 Head Manager</option>
              <option value="hr">🏢 HR</option>
              <option value="admin">🔑 Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            >
              <option value="">Select Department</option>
              {departments && departments.length > 0 ? 
                departments.map(dept => dept && (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                )) : 
                <option disabled>No departments found</option>
              }
            </select>
          </div>
        </div>

        {/* Manager Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Reports To (Manager)</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.managerId}
            onChange={(e) => setFormData(prev => ({ ...prev, managerId: e.target.value }))}
          >
            <option value="">No Manager (Top Level)</option>
            {users && users.length > 0 ? 
              users
                .filter(u => ['admin', 'hr', 'manager', 'head-manager', 'supervisor'].includes(u.role))
                .filter(u => formData.department ? u.employeeInfo.department === formData.department : true)
                .map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.profile.firstName} {manager.profile.lastName} ({manager.role})
                  </option>
                )) : 
              <option disabled>No managers found</option>
            }
          </select>
          <p className="text-xs text-gray-500">Select who this person reports to</p>
        </div>

          <Input
            label="Position"
          type="text"
          value={formData.position}
          onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Phone (Optional)"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
          
          <Input
            label="Hire Date"
            type="date"
            value={formData.hireDate}
            onChange={(e) => setFormData(prev => ({ ...prev, hireDate: e.target.value }))}
            required
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="btn-primary" 
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit User Modal Component  
const EditUserModal = ({ isOpen, onClose, user, departments, businessId, users }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    firstName: user.profile.firstName,
    lastName: user.profile.lastName,
    email: user.profile.email,
    role: user.role,
    department: user.employeeInfo.department || '',
    position: user.employeeInfo.position,
    phone: user.profile.phone || '',
    isActive: user.isActive,
    managerId: user.employeeInfo.managerId || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await dispatch(updateUser({
        userId: user.id,
        userData: formData,
        businessId
      })).unwrap();
      
      onClose();
    } catch (error) {
      alert('Failed to update user: ' + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
          <Input
            label="Last Name"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Role <span className="text-red-500">*</span></label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              required
            >
              <option value="">Select Role</option>
              <option value="employee">👤 Employee</option>
              <option value="supervisor">👷 Supervisor</option>
              <option value="manager">👥 Manager</option>
              <option value="head-manager">👑 Head Manager</option>
              <option value="hr">🏢 HR</option>
              <option value="admin">🔑 Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            >
              <option value="">Select Department</option>
              {departments && departments.length > 0 ? 
                departments.map(dept => dept && (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                )) : 
                <option disabled>No departments found</option>
              }
            </select>
          </div>
        </div>

        {/* Manager Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Reports To (Manager)</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.managerId}
            onChange={(e) => setFormData(prev => ({ ...prev, managerId: e.target.value }))}
          >
            <option value="">No Manager (Top Level)</option>
            {users && users.length > 0 ? 
              users
                .filter(u => ['admin', 'hr', 'manager', 'head-manager', 'supervisor'].includes(u.role))
                .filter(u => u.id !== user.id) // Don't allow self-reporting
                .filter(u => formData.department ? u.employeeInfo.department === formData.department : true)
                .map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.profile.firstName} {manager.profile.lastName} ({manager.role})
                  </option>
                )) : 
              <option disabled>No managers found</option>
            }
          </select>
          <p className="text-xs text-gray-500">Select who this person reports to</p>
        </div>

        <Input
          label="Position"
          type="text"
          value={formData.position}
          onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
          required
        />

        <Input
          label="Phone (Optional)"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Active User
          </label>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="btn-primary" 
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Update User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UsersPage;
