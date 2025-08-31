import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

// Firebase
import { serverTimestamp } from 'firebase/firestore';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchEvaluation, fetchEvaluationTemplate, updateEvaluation, saveManagerReviewProgress } from '../../store/slices/evaluationSlice';

// Utils
import { formatDateTime } from '../../utils/dateUtils';

// Components
import { Card, Button, LoadingSpinner, TextArea, Badge } from '../../components/common';

// Icons
import { ArrowLeftIcon, CheckIcon, UserIcon, StarIcon, BookmarkIcon } from '@heroicons/react/24/outline';

const EvaluationReviewPage = () => {
  const { evaluationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  
  const [evaluation, setEvaluation] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [managerResponses, setManagerResponses] = useState({
    categoryResponses: {},
    overallComments: '',
    targets: {}
  });

  console.log('🚀 EvaluationReviewPage mounted');
  console.log('📋 Evaluation ID:', evaluationId);

  useEffect(() => {
    const loadEvaluationData = async () => {
      if (!evaluationId) {
        console.error('❌ No evaluation ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📝 Loading evaluation data...');
        
        // Load the evaluation
        const evalResult = await dispatch(fetchEvaluation({
          businessId: user.businessId,
          evaluationId: evaluationId
        }));
        console.log('📊 Evaluation result:', evalResult);
        
        if (evalResult.payload) {
          const evalData = evalResult.payload;
          setEvaluation(evalData);
          console.log('✅ Loaded evaluation:', evalData);
          
          // Load the template
          if (evalData.templateId) {
            console.log('📑 Loading template:', evalData.templateId);
            const templateResult = await dispatch(fetchEvaluationTemplate({
              businessId: user.businessId,
              templateId: evalData.templateId
            }));
            
            if (templateResult.payload) {
              setTemplate(templateResult.payload);
              console.log('✅ Loaded template:', templateResult.payload);
              
              // Initialize manager responses structure
              const initialManagerResponses = {
                categoryResponses: {},
                overallComments: '',
                targets: {}
              };
              
              // First, initialize all categories and questions from template
              if (templateResult.payload.categories) {
                templateResult.payload.categories.forEach(category => {
                  initialManagerResponses.categoryResponses[category.id] = {};
                  initialManagerResponses.targets[category.id] = {};
                  
                  category.questions?.forEach(question => {
                    initialManagerResponses.categoryResponses[category.id][question.id] = {
                      managerRating: 1,
                      managerComment: ''
                    };
                    initialManagerResponses.targets[category.id][question.id] = {
                      target: 1,
                      targetComment: ''
                    };
                  });
                });
              }
              
              // Then, overlay existing manager review data if available
              if (evalData.managerReview) {
                console.log('📋 Loading existing manager review data:', evalData.managerReview);
                
                // Merge existing data with initialized structure
                if (evalData.managerReview.categoryResponses) {
                  Object.keys(evalData.managerReview.categoryResponses).forEach(categoryId => {
                    if (initialManagerResponses.categoryResponses[categoryId]) {
                      Object.keys(evalData.managerReview.categoryResponses[categoryId]).forEach(questionId => {
                        if (initialManagerResponses.categoryResponses[categoryId][questionId]) {
                          initialManagerResponses.categoryResponses[categoryId][questionId] = {
                            ...initialManagerResponses.categoryResponses[categoryId][questionId],
                            ...evalData.managerReview.categoryResponses[categoryId][questionId]
                          };
                        }
                      });
                    }
                  });
                }
                
                if (evalData.managerReview.targets) {
                  Object.keys(evalData.managerReview.targets).forEach(categoryId => {
                    if (initialManagerResponses.targets[categoryId]) {
                      Object.keys(evalData.managerReview.targets[categoryId]).forEach(questionId => {
                        if (initialManagerResponses.targets[categoryId][questionId]) {
                          initialManagerResponses.targets[categoryId][questionId] = {
                            ...initialManagerResponses.targets[categoryId][questionId],
                            ...evalData.managerReview.targets[categoryId][questionId]
                          };
                        }
                      });
                    }
                  });
                }
                
                // Set overall comments
                if (evalData.managerReview.overallComments) {
                  initialManagerResponses.overallComments = evalData.managerReview.overallComments;
                }
                
                // Set last saved timestamp if available
                if (evalData.managerReview.lastSavedAt) {
                  setLastSaved(new Date(evalData.managerReview.lastSavedAt));
                }
                
                console.log('✅ Merged existing manager review data');
              } else {
                console.log('✅ Initialized new manager responses');
              }
              
              console.log('🏗️ Final manager responses structure:', initialManagerResponses);
              setManagerResponses(initialManagerResponses);
            } else {
              console.error('❌ Failed to load template');
            }
          } else {
            console.error('❌ No templateId found in evaluation');
          }
        } else {
          console.error('❌ Failed to load evaluation');
        }
      } catch (error) {
        console.error('❌ Error loading evaluation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvaluationData();
  }, [evaluationId, dispatch]);

  const handleManagerResponse = (categoryId, questionId, field, value) => {
    setManagerResponses(prev => ({
      ...prev,
      categoryResponses: {
        ...prev.categoryResponses,
        [categoryId]: {
          ...prev.categoryResponses?.[categoryId],
          [questionId]: {
            ...prev.categoryResponses?.[categoryId]?.[questionId],
            [field]: value
          }
        }
      }
    }));
  };

  const handleTargetResponse = (categoryId, questionId, field, value) => {
    setManagerResponses(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [categoryId]: {
          ...prev.targets?.[categoryId],
          [questionId]: {
            ...prev.targets?.[categoryId]?.[questionId],
            [field]: value
          }
        }
      }
    }));
  };

  // Calculate aggregate score from all manager ratings
  const calculateAggregateScore = () => {
    if (!template || !managerResponses?.categoryResponses) return 1;
    
    const allRatings = [];
    
    // Collect all manager ratings
    template.categories?.forEach(category => {
      if (!category?.id || !managerResponses.categoryResponses[category.id]) return;
      
      category.questions?.forEach(question => {
        if (!question?.id) return;
        
        const rating = managerResponses.categoryResponses[category.id]?.[question.id]?.managerRating;
        if (rating && rating > 0 && !isNaN(rating)) {
          allRatings.push(rating);
        }
      });
    });
    
    if (allRatings.length === 0) return 1;
    
    // Calculate average
    const sum = allRatings.reduce((acc, rating) => acc + rating, 0);
    const average = sum / allRatings.length;
    
    // Round to nearest 0.5
    return Math.round(average * 2) / 2;
  };

  const handleSaveProgress = async () => {
    console.log('💾 Saving manager review progress:', managerResponses);
    
    setSaving(true);
    
    try {
      if (!user?.businessId) {
        throw new Error('Business ID not found');
      }

      console.log('📋 Save progress params:', {
        businessId: user.businessId,
        evaluationId,
        userId: user.id,
        managerResponses
      });

      const result = await dispatch(saveManagerReviewProgress({
        businessId: user.businessId,
        evaluationId,
        managerReview: {
          ...managerResponses,
          overallRating: calculateAggregateScore(),
          savedBy: user.id
        }
      })).unwrap();

      console.log('✅ Save progress result:', result);
      setLastSaved(new Date());
      
      // Show success message without alert
      const successMessage = document.createElement('div');
      successMessage.style.position = 'fixed';
      successMessage.style.bottom = '20px';
      successMessage.style.right = '20px';
      successMessage.style.backgroundColor = '#22c55e';
      successMessage.style.color = 'white';
      successMessage.style.padding = '12px 24px';
      successMessage.style.borderRadius = '6px';
      successMessage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      successMessage.style.zIndex = '9999';
      successMessage.textContent = '✅ Progress saved successfully!';
      document.body.appendChild(successMessage);
      
      // Remove after 3 seconds
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);
    } catch (error) {
      console.error('❌ Error saving progress:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Show error message without alert
      const errorMessage = document.createElement('div');
      errorMessage.style.position = 'fixed';
      errorMessage.style.bottom = '20px';
      errorMessage.style.right = '20px';
      errorMessage.style.backgroundColor = '#ef4444';
      errorMessage.style.color = 'white';
      errorMessage.style.padding = '12px 24px';
      errorMessage.style.borderRadius = '6px';
      errorMessage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      errorMessage.style.zIndex = '9999';
      errorMessage.textContent = '❌ Progress saved but with some issues';
      document.body.appendChild(errorMessage);
      
      // Remove after 3 seconds
      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    console.log('📤 Submitting manager review:', managerResponses);
    
    setSubmitting(true);
    
    try {
      const overallRating = calculateAggregateScore();
      
      if (!user?.businessId) {
        throw new Error('Business ID not found');
      }

      console.log('📤 Submit review params:', {
        businessId: user.businessId,
        evaluationId,
        userId: user.id,
        managerResponses,
        overallRating
      });

      const result = await dispatch(updateEvaluation({
        businessId: user.businessId,
        evaluationId,
        updates: {
          managerReview: {
            ...managerResponses,
            overallRating,
            reviewedAt: serverTimestamp(),
            reviewedBy: user.id,
            inProgress: false
          },
          status: 'completed'
        }
      })).unwrap();

      console.log('✅ Successfully submitted manager review:', result);
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.style.position = 'fixed';
      successMessage.style.bottom = '20px';
      successMessage.style.right = '20px';
      successMessage.style.backgroundColor = '#22c55e';
      successMessage.style.color = 'white';
      successMessage.style.padding = '12px 24px';
      successMessage.style.borderRadius = '6px';
      successMessage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      successMessage.style.zIndex = '9999';
      successMessage.textContent = '✅ Review completed successfully!';
      document.body.appendChild(successMessage);
      
      // Remove after 3 seconds
      setTimeout(() => {
        document.body.removeChild(successMessage);
        navigate('/review-evaluations');
      }, 3000);
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Show error message
      const errorMessage = document.createElement('div');
      errorMessage.style.position = 'fixed';
      errorMessage.style.bottom = '20px';
      errorMessage.style.right = '20px';
      errorMessage.style.backgroundColor = '#ef4444';
      errorMessage.style.color = 'white';
      errorMessage.style.padding = '12px 24px';
      errorMessage.style.borderRadius = '6px';
      errorMessage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      errorMessage.style.zIndex = '9999';
      errorMessage.textContent = `❌ Failed to submit review: ${error.message}`;
      document.body.appendChild(errorMessage);
      
      // Remove after 3 seconds
      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!evaluation || !template) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/review-evaluations')}
            className="mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Review Evaluations
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evaluation Not Found</h1>
          <p className="text-gray-600">The requested evaluation could not be loaded.</p>
        </div>
      </div>
    );
  }

  const employeeResponses = evaluation.responses?.selfAssessment;
  const isCompleted = evaluation.status === 'completed';
  const isReadOnly = isCompleted;

  console.log('📋 Evaluation status:', evaluation.status);
  console.log('🔒 Read-only mode:', isReadOnly);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => navigate('/review-evaluations')}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Review Evaluations
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isCompleted ? 'Completed Review' : 'Manager Review'}
            </h1>
            <p className="text-gray-600">{template.name}</p>
            {isCompleted && evaluation.managerReview?.reviewedAt && (
              <p className="text-sm text-gray-500 mt-1">
                Completed: {formatDateTime(evaluation.managerReview.reviewedAt)}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Badge color={isCompleted ? 'green' : 'orange'} size="lg">
              {isCompleted ? 'Completed' : 'Under Review'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Employee Info */}
      <Card className="p-6 mb-6">
        <div className="flex items-center space-x-3">
          <UserIcon className="h-6 w-6 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">Employee Self-Assessment</h3>
            <p className="text-sm text-gray-600">
              Employee ID: {evaluation.evaluateeId} • Submitted: {formatDateTime(evaluation.submittedAt)}
            </p>
          </div>
        </div>
      </Card>

      {/* Self-Reflection Questions */}
      {employeeResponses?.freeTextQuestions && Object.keys(employeeResponses.freeTextQuestions).length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Self-Reflection Responses</h2>
          <div className="space-y-4">
            {template.freeTextQuestions?.map((question, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{question.text || question}</h4>
                <p className="text-gray-700">{employeeResponses.freeTextQuestions[index] || 'No response'}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category Reviews */}
      {template.categories?.map((category) => (
        <Card key={category.id} className="p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h2>
          {category.description && (
            <p className="text-gray-600 mb-4">{category.description}</p>
          )}
          
          <div className="space-y-8">
            {category.questions?.map(question => {
              const employeeResponse = employeeResponses?.categoryResponses?.[category.id]?.[question.id];
              
              return (
                <div key={question.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                  <h3 className="font-medium text-gray-900 mb-4">{question.text}</h3>
                  
                  {/* Employee Response Display */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">Employee Self-Assessment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-blue-700">Rating:</span>
                        <div className="flex items-center space-x-2">
                          <StarIcon className="h-5 w-5 text-blue-600" />
                          <span className="text-lg font-semibold text-blue-900">
                            {employeeResponse?.selfRating || '—'}
                          </span>
                          <span className="text-sm text-blue-700">
                            / {template.scoringSystem === '1-5' ? '5' : '10'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-blue-700">Comments:</span>
                        <p className="text-blue-900 mt-1">
                          {employeeResponse?.comment || 'No comments provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Manager Rating */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900">Your Manager Rating</h4>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Rating (1-{template.scoringSystem === '1-5' ? '5' : '10'})
                          </label>
                          <span className="text-lg font-semibold text-indigo-600 min-w-[3rem] text-center">
                            {managerResponses.categoryResponses[category.id]?.[question.id]?.managerRating || '—'}
                          </span>
                        </div>
                        <div className="px-2">
                          <input
                            type="range"
                            min={1}
                            max={template.scoringSystem === '1-5' ? 5 : 10}
                            step={0.5}
                            value={managerResponses.categoryResponses[category.id]?.[question.id]?.managerRating || 1}
                            onChange={isReadOnly ? undefined : (e) => handleManagerResponse(category.id, question.id, 'managerRating', parseFloat(e.target.value))}
                            disabled={isReadOnly}
                            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none slider ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            style={{
                              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${
                                ((managerResponses.categoryResponses[category.id]?.[question.id]?.managerRating || 1) - 1) / 
                                ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100
                              }%, #e5e7eb ${
                                ((managerResponses.categoryResponses[category.id]?.[question.id]?.managerRating || 1) - 1) / 
                                ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100
                              }%, #e5e7eb 100%)`
                            }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Manager Comments
                        </label>
                        <TextArea
                          rows={3}
                          value={managerResponses.categoryResponses[category.id]?.[question.id]?.managerComment || ''}
                          onChange={isReadOnly ? undefined : (e) => handleManagerResponse(category.id, question.id, 'managerComment', e.target.value)}
                          placeholder={isReadOnly ? 'No comments provided' : 'Provide feedback and comments...'}
                          disabled={isReadOnly}
                          className={isReadOnly ? 'bg-gray-50 text-gray-700' : ''}
                        />
                      </div>
                    </div>
                    
                    {/* Target Setting */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900">Next Period Target</h4>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Target Rating (1-{template.scoringSystem === '1-5' ? '5' : '10'})
                          </label>
                          <span className="text-lg font-semibold text-green-600 min-w-[3rem] text-center">
                            {managerResponses.targets[category.id]?.[question.id]?.target || '—'}
                          </span>
                        </div>
                        <div className="px-2">
                          <input
                            type="range"
                            min={1}
                            max={template.scoringSystem === '1-5' ? 5 : 10}
                            step={0.5}
                            value={managerResponses.targets[category.id]?.[question.id]?.target || 1}
                            onChange={isReadOnly ? undefined : (e) => handleTargetResponse(category.id, question.id, 'target', parseFloat(e.target.value))}
                            disabled={isReadOnly}
                            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none slider ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            style={{
                              background: `linear-gradient(to right, #22c55e 0%, #22c55e ${
                                ((managerResponses.targets[category.id]?.[question.id]?.target || 1) - 1) / 
                                ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100
                              }%, #e5e7eb ${
                                ((managerResponses.targets[category.id]?.[question.id]?.target || 1) - 1) / 
                                ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100
                              }%, #e5e7eb 100%)`
                            }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Achievement Plan
                        </label>
                        <TextArea
                          rows={3}
                          value={managerResponses.targets[category.id]?.[question.id]?.targetComment || ''}
                          onChange={isReadOnly ? undefined : (e) => handleTargetResponse(category.id, question.id, 'targetComment', e.target.value)}
                          placeholder={isReadOnly ? 'No target plan provided' : 'Describe how this target can be achieved...'}
                          disabled={isReadOnly}
                          className={isReadOnly ? 'bg-gray-50 text-gray-700' : ''}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Overall Assessment */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Assessment</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Overall Rating (Auto-calculated from all ratings)
              </label>
              <div className="text-right">
                <span className="text-2xl font-bold text-indigo-600">
                  {calculateAggregateScore()}
                </span>
                <span className="text-sm text-gray-500 ml-1">
                  / {template.scoringSystem === '1-5' ? '5' : '10'}
                </span>
              </div>
            </div>
            <div className="px-2">
              <div
                className="w-full h-3 bg-gray-200 rounded-lg relative"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${
                    ((calculateAggregateScore()) - 1) / 
                    ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100
                  }%, #e5e7eb ${
                    ((calculateAggregateScore()) - 1) / 
                    ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100
                  }%, #e5e7eb 100%)`
                }}
              >
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 w-5 h-5 bg-indigo-600 rounded-full border-2 border-white shadow-md"
                  style={{
                    left: `${((calculateAggregateScore()) - 1) / 
                      ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100}%`,
                    transform: 'translateX(-50%) translateY(-50%)'
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This score is automatically calculated as the average of all your individual question ratings.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Comments & Summary
            </label>
            <TextArea
              rows={4}
              value={managerResponses.overallComments}
              onChange={isReadOnly ? undefined : (e) => setManagerResponses(prev => ({ ...prev, overallComments: e.target.value }))}
              placeholder={isReadOnly ? 'No overall comments provided' : 'Provide overall feedback, recognition, and areas for improvement...'}
              disabled={isReadOnly}
              className={isReadOnly ? 'bg-gray-50 text-gray-700' : ''}
            />
          </div>
        </div>
      </Card>

      {/* Submit Section */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Last Saved Info */}
          {lastSaved && !isCompleted && (
            <div className="flex items-center text-sm text-gray-600">
              <BookmarkIcon className="h-4 w-4 mr-1" />
              Last saved: {formatDateTime(lastSaved)}
            </div>
          )}
          
          {isCompleted ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Review Completed</h3>
                <p className="text-sm text-gray-600">
                  This evaluation has been completed and is now read-only. The employee has been notified of the results.
                </p>
                {evaluation.managerReview?.reviewedBy && (
                  <p className="text-sm text-gray-500 mt-1">
                    Reviewed by: {evaluation.managerReview.reviewedBy}
                  </p>
                )}
              </div>
              <div className="flex items-center">
                <CheckIcon className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-green-600 font-medium">Completed</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Review Actions</h3>
                <p className="text-sm text-gray-600">
                  Save your progress to continue later, or complete the review to notify the employee.
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleSaveProgress}
                  variant="outline"
                  size="lg"
                  disabled={saving || submitting}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <BookmarkIcon className="h-5 w-5 mr-2" />
                      Save Progress
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleSubmitReview}
                  size="lg"
                  disabled={submitting || saving}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5 mr-2" />
                      Complete Review
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Slider CSS */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border: 2px solid #ffffff;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border: 2px solid #ffffff;
        }
        
        .slider:focus {
          outline: none;
        }
        
        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
        }
        
        .slider:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </div>
  );
};

export default EvaluationReviewPage;