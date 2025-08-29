import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchEvaluations, deleteEvaluation } from '../../store/slices/evaluationSlice';

// Utils
import { formatDate } from '../../utils/dateUtils';

// Components
import { Card, Button, Badge, LoadingSpinner, Modal } from '../../components/common';

// Firebase
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Icons
import { ClipboardDocumentCheckIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';

const ReviewEvaluationsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'in-progress', 'completed'
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } for confirmation
  const [userCache, setUserCache] = useState(new Map()); // Cache for user data

  // Helper function to get user display name from cache or fetch it
  const getUserDisplayName = useCallback(async (userId) => {
    if (!userId) return 'Unknown';
    
    // Check cache first
    if (userCache.has(userId)) {
      return userCache.get(userId);
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const displayName = `${userData.profile?.firstName || userData.firstName || ''} ${userData.profile?.lastName || userData.lastName || ''}`.trim() || userData.email || 'Unknown';
        
        // Cache the result
        setUserCache(prev => new Map(prev.set(userId, displayName)));
        return displayName;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    
    return 'Unknown';
  }, [userCache]);

  useEffect(() => {
    const loadManagerEvaluations = async () => {
      const managerId = user?.uid || user?.id;
      if (!managerId) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch evaluations where current user is the evaluator (assigned by them)
        const result = await dispatch(fetchEvaluations({
          businessId: user.businessId,
          filters: { evaluator: managerId }
        }));
        
        if (result.payload) {
          const allEvaluations = result.payload.evaluations || [];
          
          // Populate employee names
          const evaluationsWithNames = await Promise.all(
            allEvaluations.map(async (evaluation) => {
              if (!evaluation.evaluateeName && evaluation.evaluateeId) {
                const employeeName = await getUserDisplayName(evaluation.evaluateeId);
                return { ...evaluation, evaluateeName: employeeName };
              }
              return evaluation;
            })
          );
          
          setEvaluations(evaluationsWithNames);
        }
      } catch (error) {
        console.error('Error loading manager evaluations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadManagerEvaluations();
    }
  }, [dispatch, user, getUserDisplayName]);

  const handleDeleteEvaluation = async (evaluationId) => {
    try {
      
      const result = await dispatch(deleteEvaluation(evaluationId));
      
      if (result.type === 'evaluations/deleteEvaluation/fulfilled') {
        
        // Remove from local state
        setEvaluations(prev => prev.filter(evaluation => evaluation.id !== evaluationId));
        
        // Close confirmation dialog
        setDeleteConfirm(null);
        
        alert('Evaluation deleted successfully!');
      } else {
        console.error('Failed to delete evaluation:', result.error);
        alert('Failed to delete evaluation. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      alert('Failed to delete evaluation. Please try again.');
    }
  };

  const confirmDelete = (evaluation) => {
    setDeleteConfirm({
      id: evaluation.id,
      name: evaluation.templateName,
      employeeName: evaluation.evaluateeName || 'Unknown Employee'
    });
  };

  const handleReviewEvaluation = (evaluation) => {
    navigate(`/evaluation-review/${evaluation.id}`);
  };

  const handleViewEvaluation = (evaluation) => {
    // For now, show basic details in an alert. In a full app, this could be a modal or separate page
    const details = `
Evaluation Details:
━━━━━━━━━━━━━━━━━
Template: ${evaluation.templateName}
Employee: ${evaluation.evaluateeName || evaluation.evaluateeId}
Status: ${evaluation.status}
Created: ${formatDate(evaluation.createdAt)}
Due: ${formatDate(evaluation.dueDate)}
${evaluation.submittedAt ? `Submitted: ${formatDate(evaluation.submittedAt)}` : ''}
${evaluation.instructions ? `Instructions: ${evaluation.instructions}` : ''}
    `.trim();
    
    alert(details);
  };

  // Filter evaluations based on selected filter
  const filteredEvaluations = evaluations.filter(evaluation => {
    if (filter === 'all') return true;
    return evaluation.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'in-progress': return 'blue';
      case 'under-review': return 'orange';
      case 'completed': return 'green';
      case 'overdue': return 'red';
      default: return 'gray';
    }
  };



  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Review Evaluations</h1>
          <p className="text-gray-600 dark:text-gray-300">Review and provide feedback on team member evaluations</p>
        </div>
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Review Evaluations</h1>
        <p className="text-gray-600 dark:text-gray-300">Review and provide feedback on team member evaluations</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { key: 'all', label: 'All Evaluations', count: evaluations.length },
            { key: 'pending', label: 'Pending', count: evaluations.filter(e => e.status === 'pending').length },
            { key: 'in-progress', label: 'In Progress', count: evaluations.filter(e => e.status === 'in-progress').length },
            { key: 'under-review', label: 'Under Review', count: evaluations.filter(e => e.status === 'under-review').length },
            { key: 'completed', label: 'Completed', count: evaluations.filter(e => e.status === 'completed').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Evaluations List */}
      {filteredEvaluations.length === 0 ? (
        <Card className="text-center py-12">
          <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {filter === 'all' ? 'No evaluations assigned' : `No ${filter} evaluations`}
          </h3>
          <p className="text-gray-500 mb-6">
            {filter === 'all' 
              ? 'You haven\'t assigned any evaluations yet.'
              : `There are no ${filter} evaluations at the moment.`
            }
          </p>
          <Button variant="outline" onClick={() => setFilter('all')}>
            View All Evaluations
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvaluations.map((evaluation) => (
            <Card key={evaluation.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {evaluation.templateName}
                    </h3>
                    <Badge color={getStatusColor(evaluation.status)}>
                      {evaluation.status.charAt(0).toUpperCase() + evaluation.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Employee:</span> {evaluation.evaluateeName || evaluation.evaluateeId}
                    </div>
                    <div>
                      <span className="font-medium">Assigned:</span> {formatDate(evaluation.assignedDate)}
                    </div>
                    <div>
                      <span className="font-medium">Due:</span> {formatDate(evaluation.dueDate)}
                    </div>
                  </div>

                  {evaluation.instructions && (
                    <div className="mt-3 text-sm text-gray-600">
                      <span className="font-medium">Instructions:</span> {evaluation.instructions}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewEvaluation(evaluation)}
                    title="View basic evaluation details"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {(evaluation.status === 'under-review' || evaluation.status === 'completed') && (
                    <Button 
                      size="sm" 
                      onClick={() => handleReviewEvaluation(evaluation)}
                      className={evaluation.status === 'under-review' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                      title={evaluation.status === 'under-review' ? 'Open manager review form to provide ratings and feedback' : 'View completed review results (read-only)'}
                    >
                      {evaluation.status === 'under-review' ? 'Review Self-Assessment' : 'View Review'}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => confirmDelete(evaluation)}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Evaluation"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-900 dark:text-white">
                  Are you sure you want to permanently delete this evaluation?
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>Template:</strong> {deleteConfirm.name}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Employee:</strong> {deleteConfirm.employeeName}
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. The evaluation and all associated data will be permanently removed.
              </p>
            </div>

            <div className="flex space-x-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteEvaluation(deleteConfirm.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReviewEvaluationsPage;