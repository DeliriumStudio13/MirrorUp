import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  UserPlusIcon, 
  CurrencyDollarIcon, 
  TrashIcon, 
  PencilIcon,
  PlusIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import {
  fetchEvaluationAssignments,
  fetchBonusAssignments,
  createEvaluationAssignment,
  createBonusAssignment,
  updateEvaluationAssignment,
  updateBonusAssignment,
  deleteEvaluationAssignment,
  deleteBonusAssignment,
  bulkCreateEvaluationAssignments,
  selectEvaluationAssignments,
  selectBonusAssignments,
  selectAssignmentsLoading,
  selectAssignmentsError
} from '../../store/slices/assignmentSlice';

import {
  fetchUsers,
  selectUsers,
  selectUsersLoading
} from '../../store/slices/userSlice';

import {
  fetchDepartments,
  selectDepartments
} from '../../store/slices/departmentSlice';

import { selectUser } from '../../store/slices/authSlice';

import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AssignmentManagementPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const evaluationAssignments = useSelector(selectEvaluationAssignments);
  const bonusAssignments = useSelector(selectBonusAssignments);
  const users = useSelector(selectUsers);
  const departments = useSelector(selectDepartments);
  const isLoading = useSelector(selectAssignmentsLoading);
  const usersLoading = useSelector(selectUsersLoading);
  const error = useSelector(selectAssignmentsError);

  const [activeTab, setActiveTab] = useState('evaluation'); // 'evaluation' | 'bonus'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state for creating/editing assignments
  const [assignmentForm, setAssignmentForm] = useState({
    evaluatorId: '',
    evaluateeId: '',
    allocatorId: '',
    recipientId: '',
    assignmentType: 'permanent',
    notes: '',
    budgetLimit: '',
    expiresDate: ''
  });

  // Bulk assignment state
  const [bulkAssignments, setBulkAssignments] = useState([]);
  const [selectedEvaluator, setSelectedEvaluator] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    if (user?.businessId) {
      // Load all necessary data
      dispatch(fetchEvaluationAssignments(user.businessId));
      dispatch(fetchBonusAssignments(user.businessId));
      dispatch(fetchUsers(user.businessId));
      dispatch(fetchDepartments(user.businessId));
    }
  }, [dispatch, user?.businessId]);

  // Check admin access
  if (!user || !['admin', 'hr'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">You don't have permission to manage assignments.</p>
        </div>
      </div>
    );
  }

  // Get user display name helper
  const getUserDisplayName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.profile.firstName} ${user.profile.lastName}` : 'Unknown User';
  };

  // Get user role helper
  const getUserRole = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.role || 'unknown';
  };

  // Get department name helper
  const getDepartmentName = (userId) => {
    const user = users.find(u => u.id === userId);
    const dept = departments.find(d => d.id === user?.employeeInfo?.department);
    return dept?.name || 'No Department';
  };

  // Handle form submission
  const handleCreateAssignment = async () => {
    try {
      const assignmentData = {
        businessId: user.businessId,
        assignedBy: user.uid || user.id,
        assignedDate: new Date().toISOString(),
        ...assignmentForm
      };

      if (activeTab === 'evaluation') {
        await dispatch(createEvaluationAssignment(assignmentData)).unwrap();
      } else {
        await dispatch(createBonusAssignment(assignmentData)).unwrap();
      }

      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  // Handle bulk assignment creation
  const handleBulkCreate = async () => {
    try {
      if (!selectedEvaluator || bulkAssignments.length === 0) return;

      const assignments = bulkAssignments.map(evaluateeId => ({
        evaluatorId: selectedEvaluator,
        evaluateeId,
        assignmentType: 'permanent',
        notes: `Bulk assigned for ${getDepartmentName(evaluateeId)}`
      }));

      await dispatch(bulkCreateEvaluationAssignments({
        assignments,
        businessId: user.businessId,
        assignedBy: user.uid || user.id
      })).unwrap();

      setShowBulkModal(false);
      resetBulkForm();
    } catch (error) {
      console.error('Error creating bulk assignments:', error);
    }
  };

  // Handle edit assignment
  const handleUpdateAssignment = async () => {
    try {
      const updates = { ...assignmentForm };
      delete updates.businessId;

      if (activeTab === 'evaluation') {
        await dispatch(updateEvaluationAssignment({
          assignmentId: editingAssignment.id,
          updates
        })).unwrap();
      } else {
        await dispatch(updateBonusAssignment({
          assignmentId: editingAssignment.id,
          updates
        })).unwrap();
      }

      setEditingAssignment(null);
      resetForm();
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  // Handle delete assignment
  const handleDeleteAssignment = async (assignmentId) => {
    try {
      if (activeTab === 'evaluation') {
        await dispatch(deleteEvaluationAssignment(assignmentId)).unwrap();
      } else {
        await dispatch(deleteBonusAssignment(assignmentId)).unwrap();
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  // Reset form state
  const resetForm = () => {
    setAssignmentForm({
      evaluatorId: '',
      evaluateeId: '',
      allocatorId: '',
      recipientId: '',
      assignmentType: 'permanent',
      notes: '',
      budgetLimit: '',
      expiresDate: ''
    });
  };

  // Reset bulk form state
  const resetBulkForm = () => {
    setBulkAssignments([]);
    setSelectedEvaluator('');
    setSelectedDepartment('');
  };

  // Filter users for evaluator/allocator selection (managers and above)
  const getEvaluatorOptions = () => {
    return users.filter(u => ['admin', 'hr', 'head-manager', 'manager', 'supervisor'].includes(u.role));
  };

  // Filter users for evaluatee/recipient selection
  const getEvaluateeOptions = () => {
    return users.filter(u => u.role !== 'admin'); // Everyone except system admins can be evaluated
  };

  // Filter users for bulk assignment based on department
  const getBulkEvaluateeOptions = () => {
    if (!selectedDepartment) return [];
    
    return users.filter(u => 
      u.employeeInfo?.department === selectedDepartment && 
      !['admin', 'hr'].includes(u.role) &&
      u.id !== selectedEvaluator
    );
  };

  // Get current assignments to display
  const currentAssignments = activeTab === 'evaluation' ? evaluationAssignments : bonusAssignments;

  if (isLoading && currentAssignments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assignment Management</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Manage evaluation and bonus allocation assignments
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="sm"
                icon={UserGroupIcon}
                onClick={() => setShowBulkModal(true)}
                disabled={usersLoading}
              >
                Bulk Assign
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={() => setShowCreateModal(true)}
                disabled={usersLoading}
              >
                New Assignment
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'evaluation'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserPlusIcon className="inline h-5 w-5 mr-2" />
              Evaluation Assignments ({evaluationAssignments.length})
            </button>
            <button
              onClick={() => setActiveTab('bonus')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bonus'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CurrencyDollarIcon className="inline h-5 w-5 mr-2" />
              Bonus Assignments ({bonusAssignments.length})
            </button>
          </nav>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Assignments Table */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          {currentAssignments.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No {activeTab} assignments
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new assignment.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'evaluation' ? 'Evaluator → Evaluatee' : 'Allocator → Recipient'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getUserDisplayName(
                              activeTab === 'evaluation' ? assignment.evaluatorId : assignment.allocatorId
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getUserRole(
                              activeTab === 'evaluation' ? assignment.evaluatorId : assignment.allocatorId
                            )}
                          </div>
                        </div>
                        <span className="text-gray-400">→</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getUserDisplayName(
                              activeTab === 'evaluation' ? assignment.evaluateeId : assignment.recipientId
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getUserRole(
                              activeTab === 'evaluation' ? assignment.evaluateeId : assignment.recipientId
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDepartmentName(
                        activeTab === 'evaluation' ? assignment.evaluateeId : assignment.recipientId
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        color={assignment.assignmentType === 'permanent' ? 'green' : 
                               assignment.assignmentType === 'temporary' ? 'yellow' : 'blue'}
                        size="sm"
                      >
                        {assignment.assignmentType}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.assignedDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate" title={assignment.notes}>
                        {assignment.notes || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setEditingAssignment(assignment);
                            setAssignmentForm({
                              evaluatorId: assignment.evaluatorId || '',
                              evaluateeId: assignment.evaluateeId || '',
                              allocatorId: assignment.allocatorId || '',
                              recipientId: assignment.recipientId || '',
                              assignmentType: assignment.assignmentType || 'permanent',
                              notes: assignment.notes || '',
                              budgetLimit: assignment.budgetLimit || '',
                              expiresDate: assignment.expiresDate || ''
                            });
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(assignment)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create/Edit Assignment Modal */}
        <Modal
          isOpen={showCreateModal || editingAssignment}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAssignment(null);
            resetForm();
          }}
          title={editingAssignment ? `Edit ${activeTab} Assignment` : `Create ${activeTab} Assignment`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Evaluator/Allocator Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {activeTab === 'evaluation' ? 'Evaluator' : 'Allocator'}
                </label>
                <Select
                  value={activeTab === 'evaluation' ? assignmentForm.evaluatorId : assignmentForm.allocatorId}
                  onChange={(e) => setAssignmentForm(prev => ({
                    ...prev,
                    [activeTab === 'evaluation' ? 'evaluatorId' : 'allocatorId']: e.target.value
                  }))}
                  required
                  placeholder={`Select ${activeTab === 'evaluation' ? 'Evaluator' : 'Allocator'}`}
                  options={users.length > 0 ? getEvaluatorOptions().map(user => ({
                    value: user.id,
                    label: `${user.profile?.firstName || 'Unknown'} ${user.profile?.lastName || ''} (${user.role})`
                  })) : [{ value: '', label: 'Loading users...', disabled: true }]}
                />
              </div>

              {/* Evaluatee/Recipient Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {activeTab === 'evaluation' ? 'Evaluatee' : 'Recipient'}
                </label>
                <Select
                  value={activeTab === 'evaluation' ? assignmentForm.evaluateeId : assignmentForm.recipientId}
                  onChange={(e) => setAssignmentForm(prev => ({
                    ...prev,
                    [activeTab === 'evaluation' ? 'evaluateeId' : 'recipientId']: e.target.value
                  }))}
                  required
                  placeholder={`Select ${activeTab === 'evaluation' ? 'Evaluatee' : 'Recipient'}`}
                  options={users.length > 0 ? getEvaluateeOptions().map(user => ({
                    value: user.id,
                    label: `${user.profile?.firstName || 'Unknown'} ${user.profile?.lastName || ''} (${user.role})`
                  })) : [{ value: '', label: 'Loading users...', disabled: true }]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assignment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Type
                </label>
                <Select
                  value={assignmentForm.assignmentType}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, assignmentType: e.target.value }))}
                >
                  <option value="permanent">Permanent</option>
                  <option value="temporary">Temporary</option>
                  <option value="project">Project-based</option>
                </Select>
              </div>

              {/* Budget Limit (for bonus assignments) */}
              {activeTab === 'bonus' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Limit ($)
                  </label>
                  <Input
                    type="number"
                    value={assignmentForm.budgetLimit}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, budgetLimit: e.target.value }))}
                    placeholder="Optional budget limit"
                  />
                </div>
              )}

              {/* Expires Date (for temporary assignments) */}
              {assignmentForm.assignmentType === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expires Date
                  </label>
                  <Input
                    type="date"
                    value={assignmentForm.expiresDate}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, expiresDate: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this assignment..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAssignment(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={editingAssignment ? handleUpdateAssignment : handleCreateAssignment}
                disabled={
                  !assignmentForm[activeTab === 'evaluation' ? 'evaluatorId' : 'allocatorId'] ||
                  !assignmentForm[activeTab === 'evaluation' ? 'evaluateeId' : 'recipientId']
                }
              >
                {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Bulk Assignment Modal */}
        <Modal
          isOpen={showBulkModal}
          onClose={() => {
            setShowBulkModal(false);
            resetBulkForm();
          }}
          title="Bulk Create Evaluation Assignments"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Evaluator Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evaluator (will evaluate all selected)
                </label>
                <Select
                  value={selectedEvaluator}
                  onChange={(e) => setSelectedEvaluator(e.target.value)}
                  required
                  placeholder="Select Evaluator"
                  options={users.length > 0 ? getEvaluatorOptions().map(user => ({
                    value: user.id,
                    label: `${user.profile?.firstName || 'Unknown'} ${user.profile?.lastName || ''} (${user.role})`
                  })) : [{ value: '', label: 'Loading evaluators...', disabled: true }]}
                />
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Filter
                </label>
                <Select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  required
                  placeholder="Select Department"
                  options={departments.length > 0 ? departments.map(dept => ({
                    value: dept.id,
                    label: dept.name
                  })) : [{ value: '', label: 'Loading departments...', disabled: true }]}
                />
              </div>
            </div>

            {/* Evaluatee Selection */}
            {selectedDepartment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Evaluatees ({getBulkEvaluateeOptions().length} available)
                </label>
                <div className="border border-gray-300 rounded-md p-4 max-h-64 overflow-y-auto">
                  {getBulkEvaluateeOptions().map(user => (
                    <label key={user.id} className="flex items-center py-2">
                      <input
                        type="checkbox"
                        checked={bulkAssignments.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkAssignments(prev => [...prev, user.id]);
                          } else {
                            setBulkAssignments(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm">
                        {user.profile.firstName} {user.profile.lastName} ({user.role})
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setBulkAssignments(getBulkEvaluateeOptions().map(u => u.id))}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkAssignments([])}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkModal(false);
                  resetBulkForm();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkCreate}
                disabled={!selectedEvaluator || bulkAssignments.length === 0}
              >
                Create {bulkAssignments.length} Assignments
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <Modal
            isOpen={true}
            onClose={() => setDeleteConfirm(null)}
            title="Delete Assignment"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this {activeTab} assignment? This action cannot be undone.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
                <p className="text-sm font-medium">
                  {getUserDisplayName(
                    activeTab === 'evaluation' ? deleteConfirm.evaluatorId : deleteConfirm.allocatorId
                  )} → {getUserDisplayName(
                    activeTab === 'evaluation' ? deleteConfirm.evaluateeId : deleteConfirm.recipientId
                  )}
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDeleteAssignment(deleteConfirm.id)}
                >
                  Delete Assignment
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AssignmentManagementPage;
