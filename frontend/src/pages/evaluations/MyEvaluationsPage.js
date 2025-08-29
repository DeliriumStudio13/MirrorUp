import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchEvaluations } from '../../store/slices/evaluationSlice';

// Utils
import { formatDate } from '../../utils/dateUtils';

// Components
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Icons
import {
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

const MyEvaluationsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, in-progress, completed

  // Helper function to get max score from evaluation
  const getMaxScore = (evaluation) => {
    // Use pre-calculated maxScore if available (from enhanced evaluation data)
    if (evaluation.maxScore) {
      return evaluation.maxScore;
    }
    
    // Use stored scoring system if available
    if (evaluation.scoringSystem) {
      return evaluation.scoringSystem === '1-10' ? 10 : 5;
    }
    
    // Final fallback - default to 5-point scale (avoid guessing from score value)
    return 5;
  };

  useEffect(() => {
    const loadMyEvaluations = async () => {
      const userId = user?.uid || user?.id;
      if (!userId || !user?.businessId) {
        console.log('❌ Missing user data:', { userId, businessId: user?.businessId });
        return;
      }
      
      console.log('📋 Loading evaluations for user:', userId);
      setLoading(true);
      
      try {
        // Fetch evaluations where current user is the evaluatee
        const result = await dispatch(fetchEvaluations({
          businessId: user.businessId,
          filters: { evaluatee: userId }
        }));
        
        console.log('📊 Fetched evaluations result:', result);
        
        if (result.payload) {
          const evaluations = result.payload.evaluations || [];
          console.log('✅ Found evaluations:', evaluations.length);
          console.log('📋 Evaluation details:');
          evaluations.forEach((evaluation, index) => {
            console.log(`  ${index + 1}. ${evaluation.templateName} - Status: "${evaluation.status}" - ID: ${evaluation.id}`);
            console.log(`     Manager Review:`, evaluation.managerReview ? 'Present' : 'Missing');
            if (evaluation.managerReview?.overallRating) {
              console.log(`     Overall Rating: ${evaluation.managerReview.overallRating}`);
            }
          });
          setEvaluations(evaluations);
        } else {
          console.log('❌ No evaluations payload found');
        }
      } catch (error) {
        console.error('❌ Error loading evaluations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMyEvaluations();
  }, [dispatch, user]);

  const getStatusBadge = (evaluation) => {
    const { status, dueDate } = evaluation;
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'completed';
    
    if (isOverdue) {
      return <Badge color="red">Overdue</Badge>;
    }
    
    switch (status) {
      case 'pending':
        return <Badge color="yellow">Assigned</Badge>;
      case 'in-progress':
        return <Badge color="blue">In Progress</Badge>;
      case 'under-review':
        return <Badge color="orange">Under Review</Badge>;
      case 'completed':
        return <Badge color="green">Completed</Badge>;
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
      case 'under-review':
        return <EyeIcon className="h-5 w-5 text-orange-600" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    if (filter === 'all') return true;
    if (filter === 'overdue') {
      return evaluation.dueDate && 
             new Date(evaluation.dueDate) < new Date() && 
             evaluation.status !== 'completed';
    }
    return evaluation.status === filter;
  });

  const getFilterCounts = () => {
    return {
      all: evaluations.length,
      pending: evaluations.filter(e => e.status === 'pending').length,
      'in-progress': evaluations.filter(e => e.status === 'in-progress').length,
      'under-review': evaluations.filter(e => e.status === 'under-review').length,
      completed: evaluations.filter(e => e.status === 'completed').length,
      overdue: evaluations.filter(e => 
        e.dueDate && 
        new Date(e.dueDate) < new Date() && 
        e.status !== 'completed'
      ).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filterCounts = getFilterCounts();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Evaluations</h1>
        <p className="text-gray-600 dark:text-gray-300">Track your assigned evaluations and performance reviews</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All', count: filterCounts.all },
              { key: 'pending', label: 'Assigned', count: filterCounts.pending },
              { key: 'in-progress', label: 'In Progress', count: filterCounts['in-progress'] },
              { key: 'under-review', label: 'Under Review', count: filterCounts['under-review'] },
              { key: 'completed', label: 'Completed', count: filterCounts.completed },
              { key: 'overdue', label: 'Overdue', count: filterCounts.overdue }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  filter === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Evaluations List */}
      <div className="space-y-4">
        {filteredEvaluations.length === 0 ? (
          <Card className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filter === 'all' 
                ? 'No evaluations assigned' 
                : `No ${filter.replace('-', ' ')} evaluations`
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all'
                ? 'You have no evaluations assigned to you at the moment.'
                : `You have no evaluations in the ${filter.replace('-', ' ')} status.`
              }
            </p>
            {filter !== 'all' && (
              <Button
                variant="outline"
                onClick={() => setFilter('all')}
              >
                View All Evaluations
              </Button>
            )}
          </Card>
        ) : (
          filteredEvaluations.map((evaluation) => (
            <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(evaluation.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                        {evaluation.templateName || 'Untitled Evaluation'}
                      </h3>
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
                            new Date(evaluation.dueDate) < new Date() && evaluation.status !== 'completed'
                              ? 'text-red-600 font-medium'
                              : ''
                          }>
                            {formatDate(evaluation.dueDate)}
                          </span>
                        </p>
                      )}
                      {evaluation.status === 'completed' && evaluation.managerReview?.overallRating && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Final Score:</span>
                          <div className="flex items-center">
                            <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                            <span className="font-medium">{evaluation.managerReview.overallRating}/{getMaxScore(evaluation)}</span>
                          </div>
                        </div>
                      )}
                      {evaluation.status === 'under-review' && (
                        <p className="text-orange-600 text-sm font-medium">
                          ✓ Self-assessment submitted • Awaiting manager review
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
                    {evaluation.status === 'completed' ? (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/my-evaluation-results/${evaluation.id}`)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <TrophyIcon className="h-4 w-4 mr-1" />
                        View Results
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          alert(`
Evaluation Details:
━━━━━━━━━━━━━━━━━
Template: ${evaluation.templateName}
Status: ${evaluation.status}
Assigned: ${formatDate(evaluation.createdAt)}
Due: ${formatDate(evaluation.dueDate)}
${evaluation.instructions ? `Instructions: ${evaluation.instructions}` : ''}
                          `.trim());
                        }}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    )}
                    
                    {(evaluation.status === 'pending' || evaluation.status === 'in-progress') && (
                      <Button
                        size="sm"
                        as={Link}
                        to={`/evaluation-complete/${evaluation.id}`}
                      >
                        {evaluation.status === 'pending' ? 'Start' : 'Continue'}
                      </Button>
                    )}

                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MyEvaluationsPage;