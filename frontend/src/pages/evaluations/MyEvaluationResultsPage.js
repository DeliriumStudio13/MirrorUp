import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchEvaluation, fetchEvaluationTemplate } from '../../store/slices/evaluationSlice';

// Utils
import { formatDateTime } from '../../utils/dateUtils';

// Components
import { Card, Button, LoadingSpinner, Badge } from '../../components/common';

// Icons
import { ArrowLeftIcon, UserIcon, StarIcon, TrophyIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const MyEvaluationResultsPage = () => {
  const { evaluationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  
  const [evaluation, setEvaluation] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log('🚀 MyEvaluationResultsPage mounted');
  console.log('📋 Evaluation ID:', evaluationId);

  useEffect(() => {
    const loadEvaluationResults = async () => {
      if (!evaluationId) {
        console.error('❌ No evaluation ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📝 Loading evaluation results...');
        
        // Load the evaluation
        const evalResult = await dispatch(fetchEvaluation(evaluationId));
        console.log('📊 Evaluation result:', evalResult);
        
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
        console.error('❌ Error loading evaluation results:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvaluationResults();
  }, [evaluationId, dispatch]);

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
            onClick={() => navigate('/my-evaluations')}
            className="mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to My Evaluations
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evaluation Not Found</h1>
          <p className="text-gray-600">The requested evaluation could not be loaded.</p>
        </div>
      </div>
    );
  }

  const employeeResponses = evaluation.responses?.selfAssessment;
  const managerReview = evaluation.managerReview;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => navigate('/my-evaluations')}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to My Evaluations
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Evaluation Results</h1>
            <p className="text-gray-600">{template.name}</p>
            {managerReview?.reviewedAt && (
              <p className="text-sm text-gray-500 mt-1">
                Completed: {formatDateTime(managerReview.reviewedAt)}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Badge color="green" size="lg">
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Completed
            </Badge>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      {managerReview?.overallRating && (
        <Card className="p-6 mb-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-900 mb-2">Final Overall Score</h2>
              <p className="text-green-700">Your manager's final assessment</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <TrophyIcon className="h-8 w-8 text-green-600" />
                <span className="text-4xl font-bold text-green-600">
                  {managerReview.overallRating}
                </span>
                <span className="text-xl text-green-700">
                  / {template.scoringSystem === '1-5' ? '5' : '10'}
                </span>
              </div>
            </div>
          </div>
          {managerReview.overallComments && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Manager's Overall Comments</h4>
              <p className="text-gray-700">{managerReview.overallComments}</p>
            </div>
          )}
        </Card>
      )}

      {/* Self-Reflection Responses */}
      {employeeResponses?.freeTextQuestions && Object.keys(employeeResponses.freeTextQuestions).length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Self-Reflection</h2>
          <div className="space-y-4">
            {template.freeTextQuestions?.map((question, index) => (
              <div key={index} className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{question.text || question}</h4>
                <p className="text-gray-700">{employeeResponses.freeTextQuestions[index] || 'No response'}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category Results */}
      {template.categories?.map((category) => (
        <Card key={category.id} className="p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h2>
          {category.description && (
            <p className="text-gray-600 mb-4">{category.description}</p>
          )}
          
          <div className="space-y-8">
            {category.questions?.map(question => {
              const employeeResponse = employeeResponses?.categoryResponses?.[category.id]?.[question.id];
              const managerResponse = managerReview?.categoryResponses?.[category.id]?.[question.id];
              const target = managerReview?.targets?.[category.id]?.[question.id];
              
              return (
                <div key={question.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                  <h3 className="font-medium text-gray-900 mb-4">{question.text}</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Your Self-Rating */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-3">Your Self-Assessment</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <StarIcon className="h-5 w-5 text-blue-600" />
                          <span className="text-lg font-semibold text-blue-900">
                            {employeeResponse?.selfRating || '—'}
                          </span>
                          <span className="text-sm text-blue-700">
                            / {template.scoringSystem === '1-5' ? '5' : '10'}
                          </span>
                        </div>
                        {employeeResponse?.comment && (
                          <div>
                            <span className="text-sm text-blue-700 block">Your Comments:</span>
                            <p className="text-blue-900 mt-1">{employeeResponse.comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Manager's Rating */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-indigo-900 mb-3">Manager's Assessment</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <StarIcon className="h-5 w-5 text-indigo-600" />
                          <span className="text-lg font-semibold text-indigo-900">
                            {managerResponse?.managerRating || '—'}
                          </span>
                          <span className="text-sm text-indigo-700">
                            / {template.scoringSystem === '1-5' ? '5' : '10'}
                          </span>
                        </div>
                        {managerResponse?.managerComment && (
                          <div>
                            <span className="text-sm text-indigo-700 block">Manager's Feedback:</span>
                            <p className="text-indigo-900 mt-1">{managerResponse.managerComment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Next Period Target */}
                  {target && (target.target || target.targetComment) && (
                    <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-green-900 mb-3">Next Period Target</h4>
                      <div className="space-y-3">
                        {target.target && (
                          <div className="flex items-center space-x-2">
                            <TrophyIcon className="h-5 w-5 text-green-600" />
                            <span className="text-lg font-semibold text-green-900">
                              Target: {target.target}
                            </span>
                            <span className="text-sm text-green-700">
                              / {template.scoringSystem === '1-5' ? '5' : '10'}
                            </span>
                          </div>
                        )}
                        {target.targetComment && (
                          <div>
                            <span className="text-sm text-green-700 block">Achievement Plan:</span>
                            <p className="text-green-900 mt-1">{target.targetComment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MyEvaluationResultsPage;
