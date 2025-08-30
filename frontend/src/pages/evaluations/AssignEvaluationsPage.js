import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import { fetchEvaluationTemplates } from '../../store/slices/evaluationSlice';
import { fetchDepartments } from '../../store/slices/departmentSlice';
import {
  fetchEvaluationAssignments,
  fetchBonusAssignments,
  selectEvaluationAssignmentsByEvaluator
} from '../../store/slices/assignmentSlice';

// Firebase
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Components
import { Card, Button, Badge, LoadingSpinner, Modal, TextArea } from '../../components/common';

// Icons
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// Note: Using assignment-based filtering instead of department hierarchy

const AssignEvaluationsPage = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const user = useSelector(selectUser);
  const { users, loading: usersLoading } = useSelector(state => state.users);
  const { templates, loading: templatesLoading } = useSelector(state => state.evaluations);
  const { departments } = useSelector(state => state.departments);
  const myAssignments = useSelector(state => selectEvaluationAssignmentsByEvaluator(state, user?.id));

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  
  // Filter state
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 AssignEvaluations: Loading data...');
      
      try {
        // Load data with proper error handling
        const usersResult = await dispatch(fetchUsers(user?.businessId));
        console.log('👥 Users loaded:', usersResult.payload?.length || 0);
        
        const templatesResult = await dispatch(fetchEvaluationTemplates({ businessId: user?.businessId }));
        console.log('📋 Templates loaded:', templatesResult.payload?.length || 0);
        console.log('📋 Templates result:', templatesResult);
        
        const departmentsResult = await dispatch(fetchDepartments(user?.businessId));
        console.log('🏢 Departments loaded:', departmentsResult.payload?.length || 0);
        
        // Fetch both evaluation and bonus assignments to ensure complete data
        const [evalAssignmentsResult, bonusAssignmentsResult] = await Promise.all([
          dispatch(fetchEvaluationAssignments(user?.businessId)),
          dispatch(fetchBonusAssignments(user?.businessId))
        ]);

        
      } catch (error) {
        console.error('❌ Error loading data:', error);
      }
      
      // Pre-select user from URL params
      const userId = searchParams.get('user');
      if (userId) {
        setSelectedUsers([userId]);
        console.log('👤 Pre-selected user from URL:', userId);
      }
    };
    
    if (user?.businessId) {
      loadData();
    }
  }, [dispatch, searchParams, user?.businessId]);

  useEffect(() => {

    
    if (users && user && myAssignments) {
      // Filter team members based on evaluation assignments
      const assignedUserIds = myAssignments.map(assignment => assignment.evaluateeId);
      
      const filteredUsers = users.filter(u => {
        // Don't include self
        if (u.id === user.id) return false;
        
        // Include users who are assigned to be evaluated by the current user
        return assignedUserIds.includes(u.id);
      });
      
      setTeamMembers(filteredUsers);
    } else if (users && user && myAssignments?.length === 0) {
      // No assignments found - show empty list
      setTeamMembers([]);
    }
  }, [users, user?.id, user?.uid, user?.role, myAssignments, departments]);

  const getTemplateTypeBadgeColor = (type) => {
    switch (type) {
      case 'performance': return 'blue';
      case '360': return 'purple';
      case 'probationary': return 'yellow';
      case 'annual': return 'green';
      default: return 'gray';
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handlePreviewTemplate = (template, event) => {
    event.stopPropagation(); // Prevent template selection when clicking preview
    console.log('👀 Previewing template:', template.name);
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  const closePreview = () => {
    setShowPreviewModal(false);
    setPreviewTemplate(null);
  };

  const handleAssignEvaluations = async () => {
    if (!selectedTemplate || selectedUsers.length === 0 || !dueDate) {
      alert('Please select template, users, and due date');
      return;
    }

    const managerId = user?.uid || user?.id;
    if (!managerId) {
      alert('Error: Unable to identify manager. Please try logging in again.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Creating evaluations for users:', {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        userIds: selectedUsers,
        dueDate,
        instructions,
        managerId: managerId,
        assignedBy: `${user.profile?.firstName || user.firstName} ${user.profile?.lastName || user.lastName || ''}`.trim() || user.email
      });
      
      // Create an evaluation for each selected user
      const evaluationPromises = selectedUsers.map(async (userId) => {
        try {
          console.log(`🔨 Creating evaluation for user: ${userId}`);
          
          const evaluation = {
            businessId: user.businessId,
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            templateType: selectedTemplate.type || 'annual_review',
            scoringSystem: selectedTemplate.scoringSystem || '1-5', // Store scoring system for later use
            evaluateeId: userId,
            evaluatorId: managerId,
            assignedBy: `${user.profile?.firstName || user.firstName} ${user.profile?.lastName || user.lastName || ''}`.trim() || user.email,
            assignedDate: new Date().toISOString(),
            dueDate: new Date(dueDate).toISOString(),
            instructions: instructions || '',
            status: 'pending',
            workflow: {
              step: 'self_assessment',
              status: 'pending',
              dueDate: new Date(dueDate).toISOString()
            },
            selfAssessment: {
              responses: {},
              completed: false,
              completedAt: null
            },
            managerReview: {
              responses: {},
              targets: {},
              completed: false,
              completedAt: null
            },
            scores: {
              selfScore: null,
              managerScore: null,
              finalScore: null
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          console.log(`📋 Evaluation object:`, evaluation);

          // Add evaluation to Firestore
          const docRef = await addDoc(collection(db, 'evaluations'), evaluation);
          console.log(`✅ Created evaluation ${docRef.id} for user ${userId}`);
          
          return { id: docRef.id, ...evaluation };
          
        } catch (error) {
          console.error(`❌ Error creating evaluation for user ${userId}:`, error);
          throw error;
        }
      });

      await Promise.all(evaluationPromises);
      
      console.log(`🎉 Successfully created ${selectedUsers.length} evaluations`);
      alert(`Successfully assigned evaluations to ${selectedUsers.length} team members!`);
      
      setShowAssignModal(false);
      setSelectedTemplate(null);
      setSelectedUsers([]);
      setDueDate('');
      setInstructions('');
      
    } catch (error) {
      console.error('❌ Error assigning evaluations:', error);
      alert('Failed to assign evaluations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (usersLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assign Evaluations</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select templates and assign evaluations to your team members
          </p>
        </div>
      </div>

      {/* Selection Summary */}
      {(selectedTemplate || selectedUsers.length > 0) && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="p-4">
            <h3 className="font-medium text-blue-900 mb-2">Assignment Summary</h3>
            <div className="space-y-2">
              {selectedTemplate && (
                <p className="text-sm text-blue-800">
                  <strong>Template:</strong> {selectedTemplate.name}
                </p>
              )}
              {selectedUsers.length > 0 && (
                <p className="text-sm text-blue-800">
                  <strong>Users:</strong> {selectedUsers.length} selected
                </p>
              )}
            </div>
            {selectedTemplate && selectedUsers.length > 0 && (
              <Button
                onClick={() => setShowAssignModal(true)}
                className="mt-3 bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Assign Now
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Select Template */}
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Step 1: Select Evaluation Template
            </h3>
            
            <div className="space-y-3">
              {!templates || templates.length === 0 ? (
                <div className="text-center py-4">
                  <ClipboardDocumentListIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    {templates === undefined ? 'Loading templates...' : 'No templates available'}
                  </p>
                  {/* Debug info */}
                  <div className="mt-2 text-xs text-gray-400">
                    Templates array: {templates ? `length ${templates.length}` : 'undefined'}, 
                    BusinessId: {user?.businessId || 'missing'}
                  </div>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge color={getTemplateTypeBadgeColor(template.type)}>
                            {template.type}
                          </Badge>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {template.categories?.length || 0} categories
                          </span>
                          {template.type === 'performance' && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-blue-600">Dual-Rating</span>
                            </>
                          )}
                        </div>
                        
                        {/* Preview Button */}
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handlePreviewTemplate(template, e)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            <EyeIcon className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Step 2: Select Team Members */}
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Step 2: Select Team Members
            </h3>
            
            <div className="space-y-3">
              {teamMembers.length === 0 ? (
                <div className="text-center py-4">
                  <UserIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    {users && myAssignments !== undefined ? 
                      myAssignments.length === 0 ? 
                        'No evaluation assignments found' : 
                        'No team members available' 
                      : 'Loading team members...'}
                  </p>
                  {myAssignments?.length === 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      Ask your admin to create evaluation assignments in the Assignment Management page.
                    </p>
                  )}
                  {/* Debug info */}
                  <div className="mt-2 text-xs text-gray-400">
                    Users: {users?.length || 0}, Assignments: {myAssignments?.length || 0}, Role: {user?.role}
                  </div>
                </div>
              ) : (
                teamMembers.map((member) => {
                  // Find department name
                  const memberDept = departments?.find(d => d.id === member.employeeInfo?.department);
                  
                  return (
                    <div
                      key={member.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.includes(member.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleUserSelection(member.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {member.profile?.firstName?.[0] || member.firstName?.[0]}
                                {member.profile?.lastName?.[0] || member.lastName?.[0]}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {member.profile?.firstName || member.firstName} {member.profile?.lastName || member.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {member.role} • {memberDept?.name || 'No department'}
                            </p>
                          </div>
                        </div>
                        {selectedUsers.includes(member.id) && (
                          <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Assignment Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Complete Assignment"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={getMinDate()}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions (Optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Additional instructions"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Assignment Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Template:</strong> {selectedTemplate?.name}</p>
              <p><strong>Users:</strong> {selectedUsers.length} team members</p>
              <p><strong>Type:</strong> {selectedTemplate?.type} evaluation</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowAssignModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignEvaluations}
              disabled={loading || !dueDate}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Assigning...
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Assign Evaluations
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <Modal
          isOpen={true}
          onClose={closePreview}
          title={`Preview: ${previewTemplate.name}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Template Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{previewTemplate.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{previewTemplate.description}</p>
                </div>
                <div className="text-right">
                  <Badge color={getTemplateTypeBadgeColor(previewTemplate.type)}>
                    {previewTemplate.type}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {previewTemplate.scoringSystem || '1-5'} Scale
                  </p>
                </div>
              </div>
            </div>

            {/* Free Text Questions */}
            {previewTemplate.freeTextQuestions && previewTemplate.freeTextQuestions.length > 0 && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Self-Reflection Questions</h3>
                <div className="space-y-4">
                  {previewTemplate.freeTextQuestions.map((question, index) => (
                    <div key={question.id || index}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {question.text || question}
                      </label>
                      <TextArea
                        rows={3}
                        disabled
                        placeholder={question.placeholder || "Employee will answer this question..."}
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Category Questions */}
            {previewTemplate.categories?.map((category) => (
              <Card key={category.id} className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{category.name}</h3>
                {category.description && (
                  <p className="text-gray-600 mb-4">{category.description}</p>
                )}
                
                <div className="space-y-6">
                  {category.questions?.map(question => {
                    console.log('🔍 Preview Question debug:', {
                      id: question.id,
                      text: question.text,
                      type: question.type,
                      willShowSlider: question.type === 'rating' || question.type === 'dualRating' || !question.type
                    });
                    
                    return (
                    <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">{question.text}</h4>
                      
                      {/* Show what employees will see - USE SAME LOGIC AS EVALUATION FORM */}
                      {(question.type === 'rating' || question.type === 'dualRating' || !question.type) && (
                        <div className="bg-gray-50 p-3 rounded border">
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Employee Rating (1-{previewTemplate.scoringSystem === '1-5' ? '5' : '10'})
                                </label>
                                <span className="text-lg font-semibold text-indigo-600">—</span>
                              </div>
                              <div className="px-2">
                                <input
                                  type="range"
                                  min={1}
                                  max={previewTemplate.scoringSystem === '1-5' ? 5 : 10}
                                  step={0.5}
                                  disabled
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Additional Comments (Optional)
                              </label>
                              <TextArea
                                rows={2}
                                disabled
                                placeholder="Employee can add comments here..."
                                className="bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show text area for text-only questions */}
                      {question.type === 'text' && (
                        <div className="bg-gray-50 p-3 rounded border">
                          <TextArea
                            rows={3}
                            disabled
                            placeholder="Employee will write a text response here..."
                            className="bg-white"
                          />
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </Card>
            ))}

            {/* Instructions */}
            {previewTemplate.instructions && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">Instructions for Employee</h3>
                <p className="text-sm text-blue-800">{previewTemplate.instructions}</p>
              </Card>
            )}
          </div>

          <div className="flex justify-end pt-4 mt-6 border-t">
            <Button
              variant="outline"
              onClick={closePreview}
            >
              Close Preview
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssignEvaluationsPage;
