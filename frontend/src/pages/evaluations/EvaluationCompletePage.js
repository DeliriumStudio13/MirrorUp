import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchEvaluation, fetchEvaluationTemplate, submitEvaluation, saveEvaluationProgress } from '../../store/slices/evaluationSlice';

// Utils
import { formatDate, formatDateTime } from '../../utils/dateUtils';

// Components
import { Card, Button, LoadingSpinner, TextArea, Badge } from '../../components/common';

// Icons
import { PencilSquareIcon, ArrowLeftIcon, CheckIcon, BookmarkIcon } from '@heroicons/react/24/outline';

const EvaluationCompletePage = () => {
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
  const [responses, setResponses] = useState({
    freeTextQuestions: {},
    categoryResponses: {}
  });

  console.log('🚀 EvaluationCompletePage mounted');
  console.log('📋 Evaluation ID:', evaluationId);

  useEffect(() => {
    const loadEvaluationData = async () => {
      if (!evaluationId) {
        console.log('❌ No evaluation ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📋 Loading evaluation:', evaluationId);
        
        // Load the evaluation
        const evalResult = await dispatch(fetchEvaluation(evaluationId));
        
        if (evalResult.payload) {
          const evalData = evalResult.payload;
          setEvaluation(evalData);
          console.log('✅ Loaded evaluation:', evalData);
          
          // Load the template
          if (evalData.templateId) {
            console.log('📑 Loading template:', evalData.templateId);
            const templateResult = await dispatch(fetchEvaluationTemplate(evalData.templateId));
            
            if (templateResult.payload) {
              setTemplate(templateResult.payload);
              console.log('✅ Loaded template:', templateResult.payload);
              
              // Check if there are existing responses to pre-populate
              const existingResponses = evalData.responses?.selfAssessment;
              console.log('💾 Existing responses found:', existingResponses);
              
              // Initialize response structure
              const initialResponses = {
                freeTextQuestions: {},
                categoryResponses: {}
              };
              
              // Initialize free text responses
              if (templateResult.payload.freeTextQuestions) {
                templateResult.payload.freeTextQuestions.forEach((question, index) => {
                  // Use existing response if available, otherwise empty string
                  initialResponses.freeTextQuestions[index] = 
                    existingResponses?.freeTextQuestions?.[index] || '';
                });
              }
              
              // Initialize category responses
              if (templateResult.payload.categories) {
                templateResult.payload.categories.forEach(category => {
                  initialResponses.categoryResponses[category.id] = {};
                  category.questions?.forEach(question => {
                    // Use existing response if available, otherwise defaults
                    const existingCategoryResponse = existingResponses?.categoryResponses?.[category.id]?.[question.id];
                    initialResponses.categoryResponses[category.id][question.id] = {
                      selfRating: existingCategoryResponse?.selfRating || 1, // Default to 1 for sliders
                      comment: existingCategoryResponse?.comment || ''
                    };
                  });
                });
              }
              
              // Set last saved time if available
              if (existingResponses?.lastSavedAt) {
                setLastSaved(new Date(existingResponses.lastSavedAt));
                console.log('🕐 Last saved:', existingResponses.lastSavedAt);
              }
              
              setResponses(initialResponses);
              console.log('✅ Initialized responses (with saved data if available):', initialResponses);
            }
          }
        } else {
          console.log('❌ Failed to load evaluation');
        }
      } catch (error) {
        console.error('❌ Error loading evaluation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvaluationData();
  }, [evaluationId, dispatch]);

  const handleFreeTextResponse = (questionIndex, value) => {
    setResponses(prev => ({
      ...prev,
      freeTextQuestions: {
        ...prev.freeTextQuestions,
        [questionIndex]: value
      }
    }));
  };

  const handleCategoryResponse = (categoryId, questionId, field, value) => {
    setResponses(prev => ({
      ...prev,
      categoryResponses: {
        ...prev.categoryResponses,
        [categoryId]: {
          ...prev.categoryResponses[categoryId],
          [questionId]: {
            ...prev.categoryResponses[categoryId][questionId],
            [field]: value
          }
        }
      }
    }));
  };

  const handleSubmitEvaluation = async () => {
    console.log('📤 Submitting evaluation:', responses);
    
    // Basic validation - ensure we have some responses
    const hasResponses = Object.keys(responses.categoryResponses).length > 0 || 
                        Object.keys(responses.freeTextQuestions).length > 0;
    
    if (!hasResponses) {
      alert('Please provide at least one response before submitting.');
      return;
    }

    setSubmitting(true);
    
    try {
      console.log('📝 Submitting evaluation with data:', {
        evaluationId,
        responses: {
          selfAssessment: {
            freeTextQuestions: responses.freeTextQuestions,
            categoryResponses: responses.categoryResponses,
            submittedAt: new Date().toISOString(),
            submittedBy: user?.id || user?.uid
          }
        }
      });

      const result = await dispatch(submitEvaluation({
        evaluationId,
        responses: {
          selfAssessment: {
            freeTextQuestions: responses.freeTextQuestions,
            categoryResponses: responses.categoryResponses,
            submittedAt: new Date().toISOString(),
            submittedBy: user?.id || user?.uid
          }
        }
      }));

      if (result.type === 'evaluations/submitEvaluation/fulfilled') {
        console.log('✅ Successfully submitted evaluation');
        
        // Show success message
        alert('✅ Evaluation submitted successfully! Your manager will now review your self-assessment.');
        
        // Navigate back to pending evaluations (it should be empty now)
        navigate('/pending-evaluations');
      } else {
        console.error('❌ Failed to submit evaluation:', result.error);
        alert('❌ Failed to submit evaluation. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error submitting evaluation:', error);
      alert('❌ An error occurred while submitting your evaluation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProgress = async () => {
    console.log('💾 Saving evaluation progress:', responses);
    
    setSaving(true);
    
    try {
      const result = await dispatch(saveEvaluationProgress({
        evaluationId,
        responses: {
          freeTextQuestions: responses.freeTextQuestions,
          categoryResponses: responses.categoryResponses,
          savedBy: user?.id || user?.uid
        }
      }));

      if (result.type === 'evaluations/saveEvaluationProgress/fulfilled') {
        console.log('✅ Successfully saved evaluation progress');
        setLastSaved(new Date());
        
        // Show subtle success message
        alert('💾 Progress saved successfully! You can continue later.');
      } else {
        console.error('❌ Failed to save progress:', result.error);
        alert('❌ Failed to save progress. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving progress:', error);
      alert('❌ An error occurred while saving progress. Please try again.');
    } finally {
      setSaving(false);
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
            onClick={() => navigate('/pending-evaluations')}
            className="mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Pending Evaluations
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evaluation Not Found</h1>
          <p className="text-gray-600">The requested evaluation could not be loaded.</p>
        </div>

        <Card className="text-center py-12">
          <PencilSquareIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Evaluation not available</h3>
          <p className="text-gray-500 mb-6">
            This evaluation may not exist or you may not have access to it.
          </p>
          <Button variant="outline" onClick={() => navigate('/pending-evaluations')}>
            View Pending Evaluations
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
          ring: 2px solid #6366f1;
          ring-offset: 2px;
        }
      `}</style>
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => navigate('/pending-evaluations')}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Pending Evaluations
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{template.name}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div>Assigned by: {evaluation.assignedBy}</div>
          <div>Due: {formatDate(evaluation.dueDate)}</div>
          <Badge color="yellow">Self Assessment Phase</Badge>
        </div>
        {template.instructions && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900">{template.instructions}</p>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Free Text Questions */}
        {template.freeTextQuestions && template.freeTextQuestions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Self-Reflection Questions</h2>
            <p className="text-gray-600 mb-6">Please answer these questions thoughtfully before proceeding to the ratings.</p>
            
            <div className="space-y-6">
              {template.freeTextQuestions.map((question, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {index + 1}. {typeof question === 'string' ? question : question.text || question}
                  </label>
                  <TextArea
                    rows={4}
                    value={responses.freeTextQuestions[index] || ''}
                    onChange={(e) => handleFreeTextResponse(index, e.target.value)}
                    placeholder={
                      typeof question === 'object' && question.placeholder ? 
                      question.placeholder : 
                      "Enter your response..."
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Category Questions */}
        {template.categories && template.categories.map(category => (
          <Card key={category.id} className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{category.name}</h2>
            {category.description && (
              <p className="text-gray-600 mb-4">{category.description}</p>
            )}
            
            <div className="space-y-6">
              {category.questions?.map(question => {
                console.log('🔍 Question debug:', {
                  id: question.id,
                  text: question.text,
                  type: question.type,
                  willShowSlider: question.type === 'rating' || question.type === 'dualRating' || !question.type
                });
                
                return (
                <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <h3 className="font-medium text-gray-900 mb-3">{question.text}</h3>
                  
                  {(question.type === 'rating' || question.type === 'dualRating' || !question.type) && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Your Rating (1-{template.scoringSystem === '1-5' ? '5' : '10'})
                          </label>
                          <span className="text-lg font-semibold text-indigo-600 min-w-[3rem] text-center">
                            {responses.categoryResponses[category.id]?.[question.id]?.selfRating || '—'}
                          </span>
                        </div>
                        <div className="px-2">
                          <input
                            type="range"
                            min={1}
                            max={template.scoringSystem === '1-5' ? 5 : 10}
                            step={0.5}
                            value={responses.categoryResponses[category.id]?.[question.id]?.selfRating || 1}
                            onChange={(e) => handleCategoryResponse(category.id, question.id, 'selfRating', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${
                                ((responses.categoryResponses[category.id]?.[question.id]?.selfRating || 1) - 1) / 
                                ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100
                              }%, #e5e7eb ${
                                ((responses.categoryResponses[category.id]?.[question.id]?.selfRating || 1) - 1) / 
                                ((template.scoringSystem === '1-5' ? 5 : 10) - 1) * 100
                              }%, #e5e7eb 100%)`
                            }}
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1</span>
                            <span>{template.scoringSystem === '1-5' ? '5' : '10'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comments (Optional)
                        </label>
                        <TextArea
                          rows={3}
                          value={responses.categoryResponses[category.id]?.[question.id]?.comment || ''}
                          onChange={(e) => handleCategoryResponse(category.id, question.id, 'comment', e.target.value)}
                          placeholder="Add any comments about your rating..."
                        />
                      </div>
                    </div>
                  )}
                  
                  {question.type === 'text' && (
                    <div>
                      <TextArea
                        rows={4}
                        value={responses.categoryResponses[category.id]?.[question.id]?.comment || ''}
                        onChange={(e) => handleCategoryResponse(category.id, question.id, 'comment', e.target.value)}
                        placeholder="Enter your response..."
                      />
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </Card>
        ))}

        {/* Save & Submit Section */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Progress Info */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Save Your Progress</h3>
                <p className="text-sm text-gray-600">
                  Save your work and come back later, or submit when ready.
                </p>
                {lastSaved && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last saved: {formatDateTime(lastSaved)}
                  </p>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleSaveProgress}
                variant="outline"
                size="lg"
                disabled={saving || submitting}
                className="flex-1"
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
                onClick={handleSubmitEvaluation}
                size="lg"
                disabled={submitting || saving}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 flex-1"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5 mr-2" />
                    Submit Self-Assessment
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              💡 Tip: Save your progress regularly to avoid losing your work!
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EvaluationCompletePage;