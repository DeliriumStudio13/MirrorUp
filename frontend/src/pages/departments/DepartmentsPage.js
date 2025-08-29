import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOfficeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Card, Button, Input, Modal, Select, Badge, LoadingSpinner } from '../../components/common';
import { 
  fetchDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  selectDepartments, 
  selectDepartmentsLoading, 
  selectDepartmentsError 
} from '../../store/slices/departmentSlice';
import { selectUser } from '../../store/slices/authSlice';
import { 
  fetchUsers,
  selectUsers 
} from '../../store/slices/userSlice';

const DepartmentsPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);
  const departments = useSelector(selectDepartments);
  const users = useSelector(selectUsers);
  const loading = useSelector(selectDepartmentsLoading);
  const error = useSelector(selectDepartmentsError);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Fetch departments and users on component mount
  useEffect(() => {
    if (currentUser?.businessId) {
      dispatch(fetchDepartments(currentUser.businessId));
      dispatch(fetchUsers(currentUser.businessId));
    }
  }, [dispatch, currentUser?.businessId]);

  // Helper function to get manager name
  const getManagerName = (managerId) => {
    if (!managerId) return 'Unassigned';
    const manager = users.find(user => user.id === managerId);
    return manager ? `${manager.profile.firstName} ${manager.profile.lastName}` : 'Unassigned';
  };

  // Filter departments based on search
  const filteredDepartments = departments.filter(dept => 
    dept?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Build department hierarchy
  const buildHierarchy = (depts) => {
    const departmentMap = {};
    const rootDepartments = [];

    // Create a map of all departments
    depts.forEach(dept => {
      if (dept && dept.id) {
        departmentMap[dept.id] = { ...dept, children: [] };
      }
    });

    // Build the hierarchy
    depts.forEach(dept => {
      if (dept && dept.id) {
        if (dept.parentDepartment && departmentMap[dept.parentDepartment]) {
          departmentMap[dept.parentDepartment].children.push(departmentMap[dept.id]);
        } else {
          rootDepartments.push(departmentMap[dept.id]);
        }
      }
    });

    return rootDepartments;
  };

  const hierarchicalDepartments = buildHierarchy(filteredDepartments);

  const handleAddDepartment = () => {
    if (!loading) { // Prevent opening modal while loading
      setSelectedDepartment(null);
      setIsAddModalOpen(true);
    }
  };

  const handleEditDepartment = (department) => {
    setSelectedDepartment(department);
    setIsEditModalOpen(true);
  };

  const handleDeleteDepartment = async (departmentId, departmentName) => {
    if (window.confirm(`Are you sure you want to delete "${departmentName}"? This action cannot be undone.`)) {
      try {
        await dispatch(deleteDepartment({ departmentId, businessId: currentUser.businessId })).unwrap();
      } catch (error) {
        alert('Failed to delete department: ' + error);
      }
    }
  };

  // Remove unused function to fix ESLint warning
  // const getDepartmentPath = (dept, allDepts) => {
  //   const path = [dept.name];
  //   let currentDept = dept;
    
  //   while (currentDept.parentDepartment) {
  //     const parent = allDepts.find(d => d.id === currentDept.parentDepartment);
  //     if (parent) {
  //       path.unshift(parent.name);
  //       currentDept = parent;
  //     } else {
  //       break;
  //     }
  //   }
    
  //   return path.join(' > ');
  // };

  const DepartmentCard = ({ department, level = 0 }) => (
    <div className="space-y-2">
      <Card className={`${level > 0 ? 'ml-8 border-l-4 border-indigo-200' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
              department.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <BuildingOfficeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{department.name}</h3>
                <Badge className={department.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {department.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {department.description && (
                <p className="text-sm text-gray-600 mt-1">{department.description}</p>
              )}
              <div className="flex items-center text-sm text-gray-500 mt-2 space-x-4">
                <span>Manager: {getManagerName(department.manager)}</span>
                <span>Employees: {department.employeeCount || 0}</span>
                {level === 0 && department.parentDepartment && (
                  <span className="flex items-center">
                    <ChevronRightIcon className="w-4 h-4 mr-1" />
                    Sub-department
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditDepartment(department)}
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-800"
              onClick={() => handleDeleteDepartment(department.id, department.name)}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Render child departments */}
      {department.children && department.children.length > 0 && (
        <div className="ml-4">
          {department.children.map(childDept => (
            <DepartmentCard key={childDept.id} department={childDept} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Department Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Organize your company structure and reporting hierarchy</p>
        </div>
        <Button 
          onClick={handleAddDepartment}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Department
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="max-w-md">
          <Input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Departments List */}
      <div className="space-y-4">
        {hierarchicalDepartments.length === 0 && !loading && (
          <Card className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No departments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search.' 
                : 'Get started by creating your first department.'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button onClick={handleAddDepartment} className="btn-primary">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Department
                </Button>
              </div>
            )}
          </Card>
        )}

        {hierarchicalDepartments.map(dept => (
          <DepartmentCard key={dept.id} department={dept} />
        ))}
      </div>

      {/* Add Department Modal */}
      {isAddModalOpen && (
        <AddDepartmentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          departments={departments}
          businessId={currentUser.businessId}
        />
      )}

      {/* Edit Department Modal */}
      {isEditModalOpen && selectedDepartment && (
        <EditDepartmentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          department={selectedDepartment}
          departments={departments}
          businessId={currentUser.businessId}
        />
      )}
    </div>
  );
};

// Add Department Modal Component
const AddDepartmentModal = ({ isOpen, onClose, departments, businessId }) => {
  const dispatch = useDispatch();
  const users = useSelector(selectUsers);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentDepartment: '',
    manager: '',
    budget: '',
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);

    try {
      await dispatch(createDepartment({
        departmentData: formData,
        businessId
      })).unwrap();
      
      // Refresh the departments list
      dispatch(fetchDepartments(businessId));
      
      onClose();
      setFormData({
        name: '',
        description: '',
        parentDepartment: '',
        manager: '',
        budget: '',
        location: ''
      });
    } catch (error) {
      alert('Failed to create department: ' + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Department">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Department Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />

        <div className="space-y-2">
          <label className="label">Description (Optional)</label>
          <textarea
            className="input min-h-[80px]"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the department's purpose and responsibilities..."
          />
        </div>

        <Select
          label="Parent Department (Optional)"
          value={formData.parentDepartment}
          onChange={(e) => setFormData(prev => ({ ...prev, parentDepartment: e.target.value }))}
          placeholder="-- No Parent (Root Department) --"
          options={[
            { value: '', label: '-- No Parent (Root Department) --' },
            ...buildDepartmentTree(departments, null)
              .filter(dept => dept.isActive) // Only show active departments
              .map(dept => ({
                value: dept.id,
                label: dept.displayName
              }))
          ]}
        />

        <Select
          label="Department Manager (Optional)"
          value={formData.manager}
          onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
          placeholder="-- No Manager Assigned --"
          options={[
            { value: '', label: '-- No Manager Assigned --' },
            ...users.filter(user => user.role === 'head-manager').map(user => ({
              value: user.id,
              label: `${user.profile?.firstName || 'Unknown'} ${user.profile?.lastName || ''} - ${user.role}`
            }))
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Budget (Optional)"
            type="number"
            step="0.01"
            value={formData.budget}
            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="0.00"
          />
          
          <Input
            label="Location (Optional)"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Office, Floor, Building..."
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
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create Department'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Helper function to build tree structure for dropdown
const buildDepartmentTree = (departments, excludeId) => {
  if (!departments) return [];
  
  const departmentMap = {};
  const roots = [];
  const result = [];
  
  // Create department map
  departments.forEach(dept => {
    if (dept.id !== excludeId) {
      departmentMap[dept.id] = { ...dept, children: [] };
    }
  });
  
  // Build parent-child relationships and find roots
  Object.values(departmentMap).forEach(dept => {
    if (dept.parentDepartment && departmentMap[dept.parentDepartment]) {
      departmentMap[dept.parentDepartment].children.push(dept);
    } else {
      roots.push(dept);
    }
  });
  
  // Recursive function to flatten tree with visual indicators
  const flattenTree = (dept, level = 0, isLast = true, parentPrefix = '') => {
    const indent = '  '.repeat(level);
    const connector = level === 0 ? '' : (isLast ? '└── ' : '├── ');
    const prefix = level === 0 ? '' : parentPrefix + connector;
    
    result.push({
      ...dept,
      displayName: `${prefix}${dept.name}${!dept.isActive ? ' (Inactive)' : ''}`,
      level
    });
    
    // Process children
    dept.children.forEach((child, index) => {
      const isLastChild = index === dept.children.length - 1;
      const childPrefix = level === 0 ? '' : parentPrefix + (isLast ? '    ' : '│   ');
      flattenTree(child, level + 1, isLastChild, childPrefix);
    });
  };
  
  // Process all root departments
  roots.forEach((root, index) => {
    const isLastRoot = index === roots.length - 1;
    flattenTree(root, 0, isLastRoot);
  });
  
  return result;
};

// Edit Department Modal Component
const EditDepartmentModal = ({ isOpen, onClose, department, departments, businessId }) => {
  const dispatch = useDispatch();
  const users = useSelector(selectUsers);
  const [formData, setFormData] = useState({
    name: department.name,
    description: department.description || '',
    parentDepartment: department.parentDepartment || '',
    manager: department.manager || '',
    budget: department.budget || '',
    location: department.location || '',
    isActive: department.isActive
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);

    try {
      await dispatch(updateDepartment({
        departmentId: department.id,
        departmentData: formData,
        businessId
      })).unwrap();
      
      // Refresh the departments list
      dispatch(fetchDepartments(businessId));
      
      onClose();
    } catch (error) {
      alert('Failed to update department: ' + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Department">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Department Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />

        <div className="space-y-2">
          <label className="label">Description (Optional)</label>
          <textarea
            className="input min-h-[80px]"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the department's purpose and responsibilities..."
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Parent Department (Optional)</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.parentDepartment || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, parentDepartment: e.target.value }))}
          >
            <option value="">-- No Parent (Root Department) --</option>
            {departments && departments.length > 0 ? 
              buildDepartmentTree(departments, department.id)
                .map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.displayName}
                  </option>
                )) : 
              <option disabled>No departments available</option>
            }
          </select>
          {/* Hierarchy info */}
          <div className="text-xs text-gray-500 italic">
            💡 Tree structure: Root departments show first, sub-departments are indented
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Department Manager (Optional)</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.manager || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
          >
            <option value="">-- No Manager Assigned --</option>
            {users && users.length > 0 ? 
              users.filter(user => user.role === 'head-manager').map(user => (
                <option key={user.id} value={user.id}>
                  {user.profile.firstName} {user.profile.lastName} - {user.role}
                </option>
              )) :
              <option disabled>No head managers available</option>
            }
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Budget (Optional)"
            type="number"
            step="0.01"
            value={formData.budget}
            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="0.00"
          />
          
          <Input
            label="Location (Optional)"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Office, Floor, Building..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-white">
            Active Department
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
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Update Department'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DepartmentsPage;
