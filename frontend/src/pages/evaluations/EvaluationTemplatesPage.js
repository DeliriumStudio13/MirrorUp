import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

// Utils
import { formatDate } from '../../utils/dateUtils';

import {
  fetchEvaluationTemplates,
  createEvaluationTemplate,
  updateEvaluationTemplate,
  deleteEvaluationTemplate,
  fixTemplateQuestionTypes,
  selectEvaluationTemplates,
  selectTemplatesLoading,
  selectEvaluationsError,
  clearError
} from '../../store/slices/evaluationSlice';
import { selectUser } from '../../store/slices/authSlice';
import { 
  Card, 
  Button, 
  Modal, 
  Input, 
  TextArea, 
  Badge, 
  LoadingSpinner 
} from '../../components/common';
import { TemplateBuilder } from '../../components/evaluations';

const EvaluationTemplatesPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);
  const templates = useSelector(selectEvaluationTemplates);
  const loading = useSelector(selectTemplatesLoading);
  const error = useSelector(selectEvaluationsError);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    type: 'performance', // performance, goals, competency, 360
    scoringSystem: '1-5', // 1-5, 1-10, percentage, letter
    categories: [],
    instructions: '',
    isActive: true
  });

  useEffect(() => {
    if (currentUser?.businessId) {
      console.log('Fetching templates for businessId:', currentUser.businessId);
      dispatch(fetchEvaluationTemplates({ 
        businessId: currentUser.businessId,
        includeInactive: true 
      }));
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    console.log('Templates updated:', templates);
  }, [templates]);

  useEffect(() => {
    if (error) {
      setTimeout(() => dispatch(clearError()), 5000);
    }
  }, [error, dispatch]);

  const handleCreateTemplate = async () => {
    try {
      await dispatch(createEvaluationTemplate({
        ...templateForm,
        businessId: currentUser.businessId,
        createdBy: currentUser.id
      })).unwrap();
      
      // Refresh the templates list
      await dispatch(fetchEvaluationTemplates({ 
        businessId: currentUser.businessId,
        includeInactive: true 
      }));
      
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleEditTemplate = async () => {
    try {
      await dispatch(updateEvaluationTemplate({
        templateId: selectedTemplate.id,
        updates: templateForm
      })).unwrap();
      
      // Refresh the templates list
      await dispatch(fetchEvaluationTemplates({ 
        businessId: currentUser.businessId,
        includeInactive: true 
      }));
      
      resetForm();
      setShowEditModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async () => {
    try {
      await dispatch(deleteEvaluationTemplate(selectedTemplate.id)).unwrap();
      
      // Refresh the templates list
      await dispatch(fetchEvaluationTemplates({ 
        businessId: currentUser.businessId,
        includeInactive: true 
      }));
      
      setShowDeleteModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      type: 'performance',
      scoringSystem: '1-5',
      categories: [],
      instructions: '',
      isActive: true
    });
  };

  const handleSaveTemplateBuilder = async (templateData) => {
    try {
      await dispatch(updateEvaluationTemplate({
        templateId: templateData.id,
        updates: {
          categories: templateData.categories,
          name: templateData.name,
          description: templateData.description,
          type: templateData.type,
          scoringSystem: templateData.scoringSystem,
          instructions: templateData.instructions,
          isActive: templateData.isActive
        }
      })).unwrap();
      
      // Refresh templates list
      await dispatch(fetchEvaluationTemplates({ 
        businessId: currentUser.businessId,
        includeInactive: true 
      }));
      
      setShowTemplateBuilder(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleCancelTemplateBuilder = () => {
    setShowTemplateBuilder(false);
    setSelectedTemplate(null);
  };

  const openEditModal = (template) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      type: template.type,
      scoringSystem: template.scoringSystem,
      categories: template.categories || [],
      instructions: template.instructions || '',
      isActive: template.isActive
    });
    setShowEditModal(true);
  };

  const openTemplateBuilder = (template) => {
    setSelectedTemplate(template);
    setShowTemplateBuilder(true);
  };

  const openViewModal = (template) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const openDeleteModal = (template) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  // Filter templates based on search and type
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || template.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'performance': return <ChartBarIcon className="h-5 w-5" />;
      case 'goals': return <AdjustmentsHorizontalIcon className="h-5 w-5" />;
      case 'competency': return <ClipboardDocumentListIcon className="h-5 w-5" />;
      case '360': return <DocumentTextIcon className="h-5 w-5" />;
      default: return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'performance': return 'blue';
      case 'goals': return 'green';
      case 'competency': return 'purple';
      case '360': return 'orange';
      default: return 'gray';
    }
  };

  const getScoringSystemLabel = (system) => {
    switch (system) {
      case '1-5': return '1-5 Scale';
      case '1-10': return '1-10 Scale';
      case 'percentage': return 'Percentage';
      case 'letter': return 'Letter Grades';
      default: return system;
    }
  };

  const handleRefresh = async () => {
    if (currentUser?.businessId) {
      await dispatch(fetchEvaluationTemplates({ 
        businessId: currentUser.businessId,
        includeInactive: true 
      }));
    }
  };

  const handleFixTemplateTypes = async () => {
    if (!currentUser?.businessId) return;
    
    try {
      console.log('🔧 Starting template migration...');
      const result = await dispatch(fixTemplateQuestionTypes(currentUser.businessId)).unwrap();
      
      alert(`✅ Successfully fixed ${result.fixedCount} templates with missing question types!`);
      
      // Refresh templates to show updated data
      await dispatch(fetchEvaluationTemplates({ 
        businessId: currentUser.businessId,
        includeInactive: true 
      }));
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      alert(`❌ Failed to fix template question types: ${error}`);
    }
  };



  if (loading && templates.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluation Templates</h1>
          <p className="text-gray-600 mt-1">Create and manage evaluation templates for your organization</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={handleFixTemplateTypes}
            disabled={loading}
            className="inline-flex items-center text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
          >
            <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
            Fix Template Types
          </Button>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
                                    placeholder="Search templates"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="performance">Performance Review</option>
              <option value="goals">Goal Setting</option>
              <option value="competency">Competency Assessment</option>
              <option value="360">360 Feedback</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getTypeIcon(template.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {template.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge color={getTypeBadgeColor(template.type)} size="sm">
                      {template.type}
                    </Badge>
                    <Badge color={template.isActive ? 'green' : 'red'} size="sm">
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {template.description}
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Scoring:</span>
                <span className="font-medium">{getScoringSystemLabel(template.scoringSystem)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Categories:</span>
                <span className="font-medium">{template.categories?.length || 0}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openViewModal(template)}
                className="flex-1"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openTemplateBuilder(template)}
                className="flex-1"
              >
                <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
                Build
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(template)}
                className="flex-1"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDeleteModal(template)}
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600 mb-4">
            {templates.length === 0 
              ? "Get started by creating your first evaluation template"
              : "Try adjusting your search or filters"
            }
          </p>
          {templates.length === 0 && (
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create First Template
            </Button>
          )}
        </div>
      )}

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Evaluation Template"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            placeholder="Template Name"
            required
          />
          
          <TextArea
            label="Description"
            value={templateForm.description}
            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
            placeholder="Template description"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Type
              </label>
              <select
                value={templateForm.type}
                onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="performance">Performance Review</option>
                <option value="goals">Goal Setting</option>
                <option value="competency">Competency Assessment</option>
                <option value="360">360 Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scoring System
              </label>
              <select
                value={templateForm.scoringSystem}
                onChange={(e) => setTemplateForm({ ...templateForm, scoringSystem: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="1-5">1-5 Scale</option>
                <option value="1-10">1-10 Scale</option>
                <option value="percentage">Percentage</option>
                <option value="letter">Letter Grades</option>
              </select>
            </div>
          </div>

          <TextArea
            label="Instructions (Optional)"
            value={templateForm.instructions}
            onChange={(e) => setTemplateForm({ ...templateForm, instructions: e.target.value })}
            placeholder="Instructions for evaluators"
            rows={3}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTemplate}
              disabled={!templateForm.name.trim()}
            >
              Create Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Template Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Evaluation Template"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            placeholder="Template Name"
            required
          />
          
          <TextArea
            label="Description"
            value={templateForm.description}
            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
            placeholder="Template description"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Type
              </label>
              <select
                value={templateForm.type}
                onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="performance">Performance Review</option>
                <option value="goals">Goal Setting</option>
                <option value="competency">Competency Assessment</option>
                <option value="360">360 Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scoring System
              </label>
              <select
                value={templateForm.scoringSystem}
                onChange={(e) => setTemplateForm({ ...templateForm, scoringSystem: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="1-5">1-5 Scale</option>
                <option value="1-10">1-10 Scale</option>
                <option value="percentage">Percentage</option>
                <option value="letter">Letter Grades</option>
              </select>
            </div>
          </div>

          <TextArea
            label="Instructions (Optional)"
            value={templateForm.instructions}
            onChange={(e) => setTemplateForm({ ...templateForm, instructions: e.target.value })}
            placeholder="Instructions for evaluators"
            rows={3}
          />

          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              checked={templateForm.isActive}
              onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Template is active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditTemplate}
              disabled={!templateForm.name.trim()}
            >
              Update Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Template Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={selectedTemplate?.name || 'Template Details'}
        size="lg"
      >
        {selectedTemplate && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex items-center space-x-2">
                  {getTypeIcon(selectedTemplate.type)}
                  <Badge color={getTypeBadgeColor(selectedTemplate.type)}>
                    {selectedTemplate.type}
                    {selectedTemplate.type === 'performance' && ' (Dual-Rating)'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Badge color={selectedTemplate.isActive ? 'green' : 'red'}>
                  {selectedTemplate.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scoring System</label>
                <p className="text-gray-900">{getScoringSystemLabel(selectedTemplate.scoringSystem)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
                <p className="text-gray-900">{selectedTemplate.categories?.length || 0}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-gray-900">{selectedTemplate.description}</p>
            </div>

            {selectedTemplate.instructions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedTemplate.instructions}</p>
              </div>
            )}

            {/* NEW: Free Text Questions Section */}
            {selectedTemplate.freeTextQuestions && selectedTemplate.freeTextQuestions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Self-Reflection Questions</label>
                <div className="space-y-3 bg-green-50 p-4 rounded-md border border-green-200">
                  {selectedTemplate.freeTextQuestions.map((question, index) => (
                    <div key={question.id || index} className="bg-white rounded p-3 border border-green-200">
                      <p className="font-medium text-gray-900">{index + 1}. {question.text}</p>
                      {question.placeholder && (
                        <p className="text-sm text-gray-500 mt-1">Hint: {question.placeholder}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NEW: Categories with dual-rating info */}
            {selectedTemplate.categories && selectedTemplate.categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories & Questions</label>
                <div className="space-y-4">
                  {selectedTemplate.categories.map((category, catIndex) => (
                    <div key={category.id || catIndex} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-900 font-medium">Weight: {category.weight}%</div>
                          {category.allowTargetSetting && (
                            <div className="text-green-600">✓ Target Setting Enabled</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {category.questions?.map((question, qIndex) => (
                          <div key={question.id || qIndex} className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex items-start space-x-2">
                              <div className="text-sm">
                                {question.type === 'dualRating' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    👥 Dual Rating
                                  </span>
                                ) : question.type === 'rating' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    ⭐ Single Rating
                                  </span>
                                ) : question.type === 'text' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    📝 Text
                                  </span>
                                ) : question.type === 'multipleChoice' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    ☑️ Multiple Choice
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    ❓ {question.type}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 flex-1">{question.text}</p>
                              {question.required && <span className="text-red-500 text-xs">*</span>}
                            </div>
                            {question.options && question.options.length > 0 && (
                              <div className="mt-2 text-xs text-gray-600">
                                Options: {question.options.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">
                Created: {formatDate(selectedTemplate.createdAt)}
              </p>
              <p className="text-sm text-gray-500">
                Last updated: {formatDate(selectedTemplate.updatedAt)}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="⚠️ Permanently Delete Template"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <TrashIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Permanent Deletion Warning
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    This will <strong>permanently delete</strong> the template "{selectedTemplate?.name}" and remove it completely from your system.
                  </p>
                  <ul className="list-disc list-inside mt-2">
                    <li>All categories and questions will be lost</li>
                    <li>Any ongoing evaluations using this template will be affected</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-700">
            Are you absolutely sure you want to proceed with the permanent deletion?
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteTemplate}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Yes, Delete Permanently'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template Builder */}
      {showTemplateBuilder && selectedTemplate && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <TemplateBuilder
            template={selectedTemplate}
            onSave={handleSaveTemplateBuilder}
            onCancel={handleCancelTemplateBuilder}
          />
        </div>
      )}
    </div>
  );
};

export default EvaluationTemplatesPage;
