import React, { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  PencilIcon,
  CheckIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  ListBulletIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Card, Button, Input, TextArea, Modal } from '../common';

const TemplateBuilder = ({ template, onSave, onCancel }) => {
  const [categories, setCategories] = useState(template?.categories || []);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    weight: 25,
    allowTargetSetting: true // NEW: Enable target setting by default
  });

  const [questionForm, setQuestionForm] = useState({
    text: '',
    type: 'dualRating', // NEW: Default to dual rating for performance templates
    required: true,
    weight: 1,
    options: [] // For multiple choice questions
  });

  // NEW: Free text questions management
  const [freeTextQuestions, setFreeTextQuestions] = useState(template?.freeTextQuestions || []);
  const [showFreeTextModal, setShowFreeTextModal] = useState(false);
  const [editingFreeText, setEditingFreeText] = useState(null);
  const [freeTextForm, setFreeTextForm] = useState({
    text: '',
    placeholder: '',
    required: true
  });

  // Generate unique IDs
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add Category
  const handleAddCategory = () => {
    const newCategory = {
      id: generateId(),
      name: categoryForm.name,
      description: categoryForm.description,
      weight: categoryForm.weight,
      allowTargetSetting: categoryForm.allowTargetSetting, // NEW: Target setting support
      questions: []
    };

    setCategories([...categories, newCategory]);
    resetCategoryForm();
    setShowAddCategoryModal(false);
  };

  // Edit Category
  const handleEditCategory = (category) => {
    setEditingCategory(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description,
      weight: category.weight,
      allowTargetSetting: category.allowTargetSetting !== false // Default to true
    });
  };

  const handleSaveCategory = () => {
    setCategories(categories.map(cat => 
      cat.id === editingCategory
        ? { ...cat, ...categoryForm }
        : cat
    ));
    resetCategoryForm();
    setEditingCategory(null);
  };

  // Delete Category
  const handleDeleteCategory = (categoryId) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
  };

  // Add Question
  const handleAddQuestion = () => {
    const newQuestion = {
      id: generateId(),
      text: questionForm.text,
      type: questionForm.type,
      required: questionForm.required,
      weight: questionForm.weight,
      options: questionForm.type === 'multipleChoice' ? questionForm.options : []
    };

    setCategories(categories.map(cat =>
      cat.id === selectedCategoryId
        ? { ...cat, questions: [...cat.questions, newQuestion] }
        : cat
    ));

    resetQuestionForm();
    setShowAddQuestionModal(false);
    setSelectedCategoryId(null);
  };

  // Edit Question
  const handleEditQuestion = (categoryId, question) => {
    setSelectedCategoryId(categoryId);
    setEditingQuestion(question.id);
    setQuestionForm({
      text: question.text,
      type: question.type,
      required: question.required,
      weight: question.weight,
      options: question.options || []
    });
  };

  const handleSaveQuestion = () => {
    setCategories(categories.map(cat =>
      cat.id === selectedCategoryId
        ? {
            ...cat,
            questions: cat.questions.map(q =>
              q.id === editingQuestion
                ? { ...q, ...questionForm, options: questionForm.type === 'multipleChoice' ? questionForm.options : [] }
                : q
            )
          }
        : cat
    ));

    resetQuestionForm();
    setEditingQuestion(null);
    setSelectedCategoryId(null);
  };

  // Delete Question
  const handleDeleteQuestion = (categoryId, questionId) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? { ...cat, questions: cat.questions.filter(q => q.id !== questionId) }
        : cat
    ));
  };

  // Move Question
  const handleMoveQuestion = (categoryId, questionId, direction) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        const questions = [...cat.questions];
        const index = questions.findIndex(q => q.id === questionId);
        
        if (direction === 'up' && index > 0) {
          [questions[index], questions[index - 1]] = [questions[index - 1], questions[index]];
        } else if (direction === 'down' && index < questions.length - 1) {
          [questions[index], questions[index + 1]] = [questions[index + 1], questions[index]];
        }
        
        return { ...cat, questions };
      }
      return cat;
    }));
  };

  // Reset Forms
  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '', weight: 25, allowTargetSetting: true });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      text: '',
      type: 'dualRating', // NEW: Default to dual rating
      required: true,
      weight: 1,
      options: []
    });
  };

  const resetFreeTextForm = () => {
    setFreeTextForm({ text: '', placeholder: '', required: true });
  };

  // Free Text Question Handlers
  const handleAddFreeTextQuestion = () => {
    const newQuestion = {
      id: generateId(),
      text: freeTextForm.text,
      placeholder: freeTextForm.placeholder,
      required: freeTextForm.required,
      order: freeTextQuestions.length + 1
    };

    setFreeTextQuestions([...freeTextQuestions, newQuestion]);
    resetFreeTextForm();
    setShowFreeTextModal(false);
    setEditingFreeText(null);
  };

  const handleSaveFreeTextQuestion = () => {
    if (editingFreeText) {
      // Update existing question
      setFreeTextQuestions(freeTextQuestions.map(q => 
        q.id === editingFreeText
          ? { ...q, ...freeTextForm }
          : q
      ));
    } else {
      // Add new question
      handleAddFreeTextQuestion();
    }
    resetFreeTextForm();
    setShowFreeTextModal(false);
    setEditingFreeText(null);
  };

  const handleCancelFreeTextModal = () => {
    resetFreeTextForm();
    setShowFreeTextModal(false);
    setEditingFreeText(null);
  };

  // Handle option changes for multiple choice questions
  const handleOptionChange = (index, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const addOption = () => {
    setQuestionForm({ 
      ...questionForm, 
      options: [...questionForm.options, ''] 
    });
  };

  const removeOption = (index) => {
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.filter((_, i) => i !== index)
    });
  };

  // Drag and Drop handlers
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Reordering categories
    if (source.droppableId === 'categories') {
      const newCategories = Array.from(categories);
      const [reorderedItem] = newCategories.splice(source.index, 1);
      newCategories.splice(destination.index, 0, reorderedItem);
      setCategories(newCategories);
    }
    // Reordering questions within a category
    else {
      const categoryId = source.droppableId.replace('questions-', '');
      setCategories(categories.map(cat => {
        if (cat.id === categoryId) {
          const newQuestions = Array.from(cat.questions);
          const [reorderedItem] = newQuestions.splice(source.index, 1);
          newQuestions.splice(destination.index, 0, reorderedItem);
          return { ...cat, questions: newQuestions };
        }
        return cat;
      }));
    }
  };

  // Get question type icon
  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case 'rating': return <StarIcon className="h-4 w-4" />;
      case 'dualRating': return <div className="flex"><StarIcon className="h-3 w-3" /><StarIcon className="h-3 w-3 ml-1" /></div>; // NEW: Two stars for dual rating
      case 'text': return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
      case 'multipleChoice': return <ListBulletIcon className="h-4 w-4" />;
      case 'yesNo': return <ScaleIcon className="h-4 w-4" />;
      default: return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
    }
  };

  // Handle Save Template
  const handleSaveTemplate = () => {
    const templateData = {
      ...template,
      categories: categories,
      freeTextQuestions: freeTextQuestions // NEW: Include free text questions
    };
    onSave(templateData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Template Builder</h2>
          <p className="text-gray-600">Build your evaluation template with categories and questions</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate}>
            Save Template
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <ScaleIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">{template?.name || 'New Template'}</h3>
            <p className="text-sm text-blue-700">
              Scoring: {template?.scoringSystem || '1-5'} • Type: {template?.type || 'performance'}
              {template?.type === 'performance' && ' • Dual-Rating System'}
            </p>
          </div>
        </div>
      </Card>

      {/* Free Text Questions Section */}
      {template?.type === 'performance' && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium text-green-900">Self-Reflection Questions</h3>
              <p className="text-sm text-green-700">Mandatory questions that employees answer before rating categories</p>
            </div>
            <Button
              onClick={() => setShowFreeTextModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              + Add Question
            </Button>
          </div>
          
          <div className="space-y-3">
            {freeTextQuestions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-md p-3 border border-green-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{index + 1}. {question.text}</p>
                    {question.placeholder && (
                      <p className="text-sm text-gray-500 mt-1">Placeholder: {question.placeholder}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {question.required && <span className="text-red-500 text-xs">Required</span>}
                    <Button
                      onClick={() => {
                        setEditingFreeText(question.id);
                        setFreeTextForm({
                          text: question.text,
                          placeholder: question.placeholder || '',
                          required: question.required
                        });
                        setShowFreeTextModal(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => {
                        setFreeTextQuestions(freeTextQuestions.filter(q => q.id !== question.id));
                      }}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {freeTextQuestions.length === 0 && (
              <div className="text-center py-4 text-green-700">
                <p>No self-reflection questions yet. Click "Add Question" to create one.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Categories */}
        <Droppable droppableId="categories">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
              {categories.map((category, categoryIndex) => (
                <Draggable key={category.id} draggableId={category.id} index={categoryIndex}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="space-y-3"
                    >
                      <Card className="p-4">
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div {...provided.dragHandleProps}>
                              <Bars3Icon className="h-5 w-5 text-gray-400 cursor-move" />
                            </div>
                            {editingCategory === category.id ? (
                              <div className="flex items-center space-x-2 flex-1">
                                <Input
                                  value={categoryForm.name}
                                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                  className="text-lg font-medium"
                                />
                                <Button size="sm" onClick={handleSaveCategory}>
                                  <CheckIcon className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setEditingCategory(null)}
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                                <p className="text-sm text-gray-600">{category.description}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Weight: {category.weight}%</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCategory(category)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Questions */}
                        <Droppable droppableId={`questions-${category.id}`}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 pl-8">
                              {category.questions.map((question, questionIndex) => (
                                <Draggable key={question.id} draggableId={question.id} index={questionIndex}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="bg-gray-50 rounded-md p-3 border"
                                    >
                                      {editingQuestion === question.id && selectedCategoryId === category.id ? (
                                        <div className="space-y-3">
                                          <TextArea
                                            value={questionForm.text}
                                            onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                                            rows={2}
                                          />
                                          <div className="flex items-center space-x-4">
                                                                        <select
                              value={questionForm.type}
                              onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                              className="rounded-md border-gray-300 text-sm"
                            >
                              <option value="dualRating">Dual Rating (Employee + Manager)</option>
                              <option value="rating">Single Rating</option>
                              <option value="text">Text Response</option>
                              <option value="multipleChoice">Multiple Choice</option>
                              <option value="yesNo">Yes/No</option>
                            </select>
                                            <div className="flex items-center">
                                              <input
                                                type="checkbox"
                                                checked={questionForm.required}
                                                onChange={(e) => setQuestionForm({ ...questionForm, required: e.target.checked })}
                                                className="mr-2"
                                              />
                                              <label className="text-sm">Required</label>
                                            </div>
                                          </div>
                                          {questionForm.type === 'multipleChoice' && (
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">Options:</label>
                                              {questionForm.options.map((option, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                  <Input
                                                    value={option}
                                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                                    placeholder={`Option ${index + 1}`}
                                                  />
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => removeOption(index)}
                                                    className="text-red-600"
                                                  >
                                                    <TrashIcon className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              ))}
                                              <Button size="sm" variant="outline" onClick={addOption}>
                                                Add Option
                                              </Button>
                                            </div>
                                          )}
                                          <div className="flex justify-end space-x-2">
                                            <Button size="sm" onClick={handleSaveQuestion}>
                                              Save
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              variant="outline" 
                                              onClick={() => setEditingQuestion(null)}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <div {...provided.dragHandleProps}>
                                              <Bars3Icon className="h-4 w-4 text-gray-400 cursor-move" />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              {getQuestionTypeIcon(question.type)}
                                              <span className="text-sm font-medium">{question.text}</span>
                                              {question.required && (
                                                <span className="text-red-500 text-xs">*</span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleMoveQuestion(category.id, question.id, 'up')}
                                              disabled={questionIndex === 0}
                                            >
                                              <ChevronUpIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleMoveQuestion(category.id, question.id, 'down')}
                                              disabled={questionIndex === category.questions.length - 1}
                                            >
                                              <ChevronDownIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleEditQuestion(category.id, question)}
                                            >
                                              <PencilIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleDeleteQuestion(category.id, question.id)}
                                              className="text-red-600 hover:text-red-700"
                                            >
                                              <TrashIcon className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              
                              {/* Add Question Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCategoryId(category.id);
                                  setShowAddQuestionModal(true);
                                }}
                                className="w-full mt-2"
                              >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Question
                              </Button>
                            </div>
                          )}
                        </Droppable>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Category Button */}
      <Button
        onClick={() => setShowAddCategoryModal(true)}
        className="w-full"
        variant="outline"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Add Category
      </Button>

      {/* Add Category Modal */}
      <Modal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        title="Add Category"
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            placeholder="Performance, Behavior, Goals..."
            required
          />
          
          <TextArea
            label="Description"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            placeholder="Describe what this category evaluates..."
            rows={2}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (%)
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              value={categoryForm.weight}
              onChange={(e) => setCategoryForm({ ...categoryForm, weight: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center">
            <input
              id="allowTargetSetting"
              type="checkbox"
              checked={categoryForm.allowTargetSetting}
              onChange={(e) => setCategoryForm({ ...categoryForm, allowTargetSetting: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="allowTargetSetting" className="ml-2 block text-sm text-gray-900">
              Allow managers to set targets for this category
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowAddCategoryModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCategory}
              disabled={!categoryForm.name.trim()}
            >
              Add Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Question Modal */}
      <Modal
        isOpen={showAddQuestionModal}
        onClose={() => setShowAddQuestionModal(false)}
        title="Add Question"
      >
        <div className="space-y-4">
          <TextArea
            label="Question Text"
            value={questionForm.text}
            onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
            placeholder="How well does this employee..."
            rows={2}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Type
            </label>
            <select
              value={questionForm.type}
              onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="dualRating">Dual Rating (Employee + Manager)</option>
              <option value="rating">Single Rating</option>
              <option value="text">Text Response</option>
              <option value="multipleChoice">Multiple Choice</option>
              <option value="yesNo">Yes/No</option>
            </select>
          </div>

          {questionForm.type === 'multipleChoice' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              {questionForm.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeOption(index)}
                    className="text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addOption}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>
          )}

          <div className="flex items-center">
            <input
              id="required"
              type="checkbox"
              checked={questionForm.required}
              onChange={(e) => setQuestionForm({ ...questionForm, required: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
              Required question
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowAddQuestionModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddQuestion}
              disabled={!questionForm.text.trim()}
            >
              Add Question
            </Button>
          </div>
        </div>
      </Modal>

      {/* Free Text Question Modal */}
      <Modal
        isOpen={showFreeTextModal}
        onClose={handleCancelFreeTextModal}
        title={editingFreeText ? "Edit Self-Reflection Question" : "Add Self-Reflection Question"}
      >
        <div className="space-y-4">
          <TextArea
            label="Question Text"
            value={freeTextForm.text}
            onChange={(e) => setFreeTextForm({ ...freeTextForm, text: e.target.value })}
            placeholder="What were your key accomplishments during this evaluation period?"
            rows={3}
            required
          />

          <TextArea
            label="Placeholder Text (Optional)"
            value={freeTextForm.placeholder}
            onChange={(e) => setFreeTextForm({ ...freeTextForm, placeholder: e.target.value })}
            placeholder="Provide helpful hint text for employees..."
            rows={2}
          />

          <div className="flex items-center">
            <input
              id="freeTextRequired"
              type="checkbox"
              checked={freeTextForm.required}
              onChange={(e) => setFreeTextForm({ ...freeTextForm, required: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="freeTextRequired" className="ml-2 block text-sm text-gray-900">
              Required question
            </label>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Self-reflection questions are answered by employees before they rate themselves on category questions. These provide context for the evaluation.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleCancelFreeTextModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFreeTextQuestion}
              disabled={!freeTextForm.text.trim()}
            >
              {editingFreeText ? 'Update Question' : 'Add Question'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TemplateBuilder;
