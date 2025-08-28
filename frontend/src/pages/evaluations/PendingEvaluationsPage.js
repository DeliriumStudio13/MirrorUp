import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchEvaluations } from '../../store/slices/evaluationSlice';

// Utils
import { formatDate } from '../../utils/dateUtils';

// Components  
import { Card, Button, Badge, LoadingSpinner } from '../../components/common';

// Icons
import {
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';

const PendingEvaluationsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log('🚀 PendingEvaluationsPage component mounted');
  console.log('👤 Current user:', user);

  useEffect(() => {
    console.log('🔥 useEffect triggered');
    console.log('🔍 Full user object:', user);
    console.log('🔍 User check:', { 
      uid: user?.uid, 
      id: user?.id,
      businessId: user?.businessId 
    });
    
    const loadPendingEvaluations = async () => {
      const userId = user?.uid || user?.id;
      if (!userId) {
        console.log('❌ No user ID found, exiting early');
        return;
      }
      
      console.log('✅ Using user ID:', userId);
      
      setLoading(true);
      
      try {
        console.log('🔄 Loading pending evaluations for user:', userId);
        console.log('🏢 Business ID:', user.businessId);
        
        // First try to fetch evaluations where current user is the evaluatee
        let result = await dispatch(fetchEvaluations({
          businessId: user.businessId,
          filters: { evaluatee: userId }
        }));
        
        console.log('📊 Fetch result (filtered by evaluatee):', result);
        
        // If that doesn't work, try fetching all evaluations for the business to debug
        if (!result.payload || result.payload.evaluations.length === 0) {
          console.log('🔍 No evaluations found for user, trying to fetch all evaluations for business...');
          
          const allResult = await dispatch(fetchEvaluations({
            businessId: user.businessId,
            filters: {}
          }));
          
          console.log('📊 All evaluations result:', allResult);
          if (allResult.payload) {
            const allEvals = allResult.payload.evaluations;
            console.log('📋 All business evaluations:', allEvals);
            console.log(`📈 Total evaluations in business: ${allEvals.length}`);
            
            // Show details of each evaluation for debugging
            allEvals.forEach((evaluation, index) => {
              console.log(`📝 Evaluation ${index + 1}:`, {
                id: evaluation.id,
                templateName: evaluation.templateName,
                evaluateeId: evaluation.evaluateeId,
                evaluatorId: evaluation.evaluatorId,
                status: evaluation.status,
                assignedBy: evaluation.assignedBy,
                dueDate: evaluation.dueDate
              });
            });
            
            // Check if any evaluation matches current user
            const userEvaluations = allEvals.filter(evaluation => evaluation.evaluateeId === userId);
            console.log(`🎯 Evaluations for current user (${userId}):`, userEvaluations);
          }
        }
        
        if (result.payload) {
          const allEvaluations = result.payload.evaluations || [];
          console.log('📋 User evaluations found:', allEvaluations.length);
          console.log('📋 User evaluations data:', allEvaluations);
          
          // Filter for pending evaluations (not started or in progress)
          const pendingEvaluations = allEvaluations.filter(evaluation => 
            evaluation.status === 'pending' || evaluation.status === 'in-progress'
          );
          
          console.log('⏳ Pending evaluations found:', pendingEvaluations.length);
          console.log('⏳ Pending evaluations data:', pendingEvaluations);
          setEvaluations(pendingEvaluations);
        } else {
          console.log('❌ No payload in result');
        }
      } catch (error) {
        console.error('Error loading pending evaluations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadPendingEvaluations();
    }
  }, [dispatch, user]);

  const handleStartEvaluation = (evaluationId) => {
    console.log('🚀 Starting evaluation:', evaluationId);
    navigate(`/evaluation-complete/${evaluationId}`);
  };

  const getStatusBadge = (evaluation) => {
    const { status, dueDate } = evaluation;
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'completed';
    
    if (isOverdue) {
      return <Badge color="red">Overdue</Badge>;
    }
    
    switch (status) {
      case 'pending':
        return <Badge color="yellow">Not Started</Badge>;
      case 'in-progress':
        return <Badge color="blue">In Progress</Badge>;
      default:
        return <Badge color="gray">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'in-progress':
        return <DocumentTextIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityLevel = (evaluation) => {
    if (!evaluation.dueDate) return 'normal';
    
    const dueDate = new Date(evaluation.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 3) return 'urgent';
    if (daysUntilDue <= 7) return 'high';
    return 'normal';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pending Evaluations</h1>
          <p className="text-gray-600">Complete your pending performance evaluations</p>
        </div>
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pending Evaluations</h1>
        <p className="text-gray-600">Complete your pending performance evaluations</p>
      </div>

      {evaluations.length === 0 ? (
        <Card className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending evaluations</h3>
          <p className="text-gray-500 mb-6">
            You don't have any evaluations waiting to be completed at the moment.
          </p>
          <Button 
            variant="outline"
            as={Link}
            to="/evaluations/my-evaluations"
          >
            View All Evaluations
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {evaluations.map((evaluation) => {
            const priority = getPriorityLevel(evaluation);
            
            return (
              <Card key={evaluation.id} className={`hover:shadow-md transition-shadow ${
                priority === 'overdue' ? 'border-red-200 bg-red-50' :
                priority === 'urgent' ? 'border-orange-200 bg-orange-50' :
                priority === 'high' ? 'border-yellow-200 bg-yellow-50' : ''
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {priority === 'overdue' && (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      )}
                      {priority !== 'overdue' && getStatusIcon(evaluation.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {evaluation.templateName || 'Untitled Evaluation'}
                          </h3>
                          {evaluation.responses?.selfAssessment && (
                            <div className="flex items-center space-x-1">
                              <BookmarkIcon className="h-4 w-4 text-blue-500" />
                              <span className="text-xs text-blue-600 font-medium">Draft Saved</span>
                            </div>
                          )}
                        </div>
                        {getStatusBadge(evaluation)}
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        {evaluation.assignedBy && (
                          <p>
                            <span className="font-medium">Assigned by:</span> {evaluation.assignedBy}
                          </p>
                        )}
                        {evaluation.assignedDate && (
                          <p>
                            <span className="font-medium">Assigned:</span>{' '}
                            {formatDate(evaluation.assignedDate)}
                          </p>
                        )}
                        {evaluation.dueDate && (
                          <p>
                            <span className="font-medium">Due:</span>{' '}
                            <span className={
                              priority === 'overdue' ? 'text-red-600 font-medium' :
                              priority === 'urgent' ? 'text-orange-600 font-medium' :
                              priority === 'high' ? 'text-yellow-600 font-medium' : ''
                            }>
                              {formatDate(evaluation.dueDate)}
                              {priority === 'overdue' && ' (Overdue)'}
                              {priority === 'urgent' && ' (Due Soon)'}
                            </span>
                          </p>
                        )}
                      </div>
                      
                      {evaluation.instructions && (
                        <p className="text-sm text-gray-700 mt-3 p-3 bg-blue-50 rounded-lg">
                          {evaluation.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 ml-4">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        as={Link}
                        to={`/evaluations/${evaluation.id}/view`}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleStartEvaluation(evaluation.id)}
                        className={
                          priority === 'overdue' ? 'bg-red-600 hover:bg-red-700' :
                          priority === 'urgent' ? 'bg-orange-600 hover:bg-orange-700' : ''
                        }
                      >
                        {(evaluation.status === 'pending' && !evaluation.responses?.selfAssessment) ? 'Start' : 'Continue'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingEvaluationsPage;