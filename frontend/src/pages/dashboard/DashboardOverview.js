import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

// Redux
import { selectUser, selectBusinessData } from '../../store/slices/authSlice';
import { setBreadcrumbs } from '../../store/slices/uiSlice';
import { fetchEvaluations } from '../../store/slices/evaluationSlice';
import { fetchUsers, selectUsers, selectUsersLoading } from '../../store/slices/userSlice';
import { fetchDepartments, selectDepartments, selectDepartmentsLoading } from '../../store/slices/departmentSlice';

// Firebase
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Utils
import { formatDate } from '../../utils/dateUtils';

// Components
import { Card, Badge } from '../../components/common';

// Icons
import {
  UsersIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  StarIcon,
  BookmarkIcon,
  UserIcon,
  PlayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const DashboardOverview = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const businessData = useSelector(selectBusinessData);
  
  // Redux selectors
  const users = useSelector(selectUsers);
  const departments = useSelector(selectDepartments);
  const usersLoading = useSelector(selectUsersLoading);
  const departmentsLoading = useSelector(selectDepartmentsLoading);
  
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCache, setUserCache] = useState(new Map()); // Cache for user data
  const [templateCache, setTemplateCache] = useState(new Map()); // Cache for template data

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

  // Helper function to get scoring system from template
  const getTemplateScoringSystem = useCallback(async (templateId) => {
    if (!templateId) return '1-5';
    
    // Check cache first
    if (templateCache.has(templateId)) {
      return templateCache.get(templateId);
    }
    
    try {
      const templateDoc = await getDoc(doc(db, 'evaluationTemplates', templateId));
      if (templateDoc.exists()) {
        const templateData = templateDoc.data();
        const scoringSystem = templateData.scoringSystem || '1-5';
        
        // Cache the result
        setTemplateCache(prev => new Map(prev.set(templateId, scoringSystem)));
        return scoringSystem;
      }
    } catch (error) {
      console.error('Error fetching template data:', error);
    }
    
    return '1-5'; // Default fallback
  }, [templateCache]);

  // Helper function to get max score for an evaluation
  const getMaxScore = useCallback(async (evaluation) => {
    // First, try to use stored scoring system if available
    if (evaluation.scoringSystem) {
      return evaluation.scoringSystem === '1-10' ? 10 : 5;
    }
    
    // If not available, fetch from template
    if (evaluation.templateId) {
      const scoringSystem = await getTemplateScoringSystem(evaluation.templateId);
      return scoringSystem === '1-10' ? 10 : 5;
    }
    
    // Final fallback - default to 5-point scale
    return 5;
  }, [getTemplateScoringSystem]);

  // Set breadcrumbs
  useEffect(() => {
    dispatch(setBreadcrumbs([])); // Clear breadcrumbs for dashboard
  }, [dispatch]);

  // Load users and departments data for admin/manager dashboards
  useEffect(() => {
    const loadBasicData = async () => {
      if (!user?.businessId) return;
      
      try {
        // Load users and departments for admin/manager roles
        if (['admin', 'hr', 'manager', 'supervisor'].includes(user.role)) {
          await Promise.all([
            dispatch(fetchUsers(user.businessId)),
            dispatch(fetchDepartments(user.businessId))
          ]);
        }
      } catch (error) {
        console.error('Failed to load basic dashboard data:', error);
      }
    };

    loadBasicData();
  }, [dispatch, user?.businessId, user?.role]);

  // Load evaluations data
  useEffect(() => {
    const loadEvaluations = async () => {
      if (!user?.businessId || (!user?.uid && !user?.id)) {
        return;
      }
      
      try {
        setLoading(true);
        let result;
        const userId = user.uid || user.id;
        
        // Load different data based on role
        if (['admin', 'hr'].includes(user.role)) {
          // Admins see all evaluations in the business
          const queryResult = await dispatch(fetchEvaluations({ 
            businessId: user.businessId,
            pageSize: 100 // Get more results for dashboard
          })).unwrap();
          result = queryResult.evaluations;
        } else if (['manager', 'supervisor'].includes(user.role)) {
          // Managers see evaluations they assigned + evaluations assigned to them
          const [assignedResult, receivedResult] = await Promise.all([
            dispatch(fetchEvaluations({ 
              businessId: user.businessId,
              filters: { evaluator: userId },
              pageSize: 100
            })).unwrap(),
            dispatch(fetchEvaluations({ 
              businessId: user.businessId,
              filters: { evaluatee: userId },
              pageSize: 100
            })).unwrap()
          ]);
          const assigned = assignedResult.evaluations || [];
          const received = receivedResult.evaluations || [];
          result = [...assigned, ...received];
        } else {
          // Employees see only evaluations assigned to them
          const queryResult = await dispatch(fetchEvaluations({ 
            businessId: user.businessId,
            filters: { evaluatee: userId },
            pageSize: 100
          })).unwrap();
          result = queryResult.evaluations || [];
        }
        
        // Populate employee names and max scores
        if (result && result.length > 0) {
          const enhancedEvaluations = await Promise.all(
            result.map(async (evaluation) => {
              let enhanced = { ...evaluation };
              
              // Add employee name for managers/admins
              if (!['employee'].includes(user?.role) && !enhanced.evaluateeName && enhanced.evaluateeId) {
                enhanced.evaluateeName = await getUserDisplayName(enhanced.evaluateeId);
              }
              
              // Pre-calculate max score for accurate display
              enhanced.maxScore = await getMaxScore(enhanced);
              
              return enhanced;
            })
          );
          setEvaluations(enhancedEvaluations);
        } else {
          setEvaluations(result || []);
        }
      } catch (error) {
        console.error('Failed to load evaluations:', error);
        setEvaluations([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvaluations();
  }, [dispatch, user?.businessId, user?.role, user?.uid, user?.id, getUserDisplayName, getMaxScore]);

  // Calculate role-based statistics
  const getStats = () => {
    const now = new Date();
    
    if (['admin', 'hr'].includes(user?.role)) {
      const activeUsers = users?.filter(u => u.isActive !== false) || [];
      const activeEvals = evaluations.filter(e => ['pending', 'in-progress', 'under-review'].includes(e.status));
      const completedEvals = evaluations.filter(e => e.status === 'completed');
      const overdueEvals = evaluations.filter(e => e.status !== 'completed' && new Date(e.dueDate) < now);
      
      // Admin/HR sees organization-wide stats
      return {
        totalEmployees: activeUsers.length,
        totalDepartments: departments?.length || 0,
        activeEvaluations: activeEvals.length,
        completedEvaluations: completedEvals.length,
        overdueEvaluations: overdueEvals.length
      };
    } else if (['manager', 'supervisor'].includes(user?.role)) {
      // Managers see team-focused stats
      const assignedByMe = evaluations.filter(e => e.evaluatorId === (user.uid || user.id));
      const assignedToMe = evaluations.filter(e => e.evaluateeId === (user.uid || user.id));
      
      return {
        teamEvaluations: assignedByMe.length,
        myEvaluations: assignedToMe.length,
        pendingReviews: assignedByMe.filter(e => e.status === 'under-review').length,
        completedThisMonth: assignedByMe.filter(e => {
          if (e.status !== 'completed') return false;
          const completedDate = e.managerReview?.reviewedAt || e.submittedAt;
          if (!completedDate) return false;
          const completed = new Date(completedDate);
          const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return completed >= thisMonth;
        }).length,
        overdueEvaluations: assignedByMe.filter(e => e.status !== 'completed' && new Date(e.dueDate) < now).length
      };
    } else {
      // Employees see personal stats
      const userId = user.uid || user.id;
      const myEvaluations = evaluations.filter(e => e.evaluateeId === userId);
      
      const latestCompleted = myEvaluations
        .filter(e => e.status === 'completed' && e.managerReview?.overallRating)
        .sort((a, b) => new Date(b.managerReview?.reviewedAt || b.submittedAt) - new Date(a.managerReview?.reviewedAt || a.submittedAt))[0];
      
      return {
        pendingEvaluations: myEvaluations.filter(e => e.status === 'pending').length,
        draftsSaved: myEvaluations.filter(e => e.status === 'in-progress').length,
        waitingForReview: myEvaluations.filter(e => e.status === 'under-review').length,
        currentRating: latestCompleted?.managerReview?.overallRating || null,
        completedThisYear: myEvaluations.filter(e => {
          if (e.status !== 'completed') return false;
          const completedDate = e.managerReview?.reviewedAt || e.submittedAt;
          if (!completedDate) return false;
          const completed = new Date(completedDate);
          return completed.getFullYear() === now.getFullYear();
        }).length,
        overdueEvaluations: myEvaluations.filter(e => e.status !== 'completed' && new Date(e.dueDate) < now).length
      };
    }
  };

  const stats = getStats();





  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
            {getGreeting()}, {user?.profile?.firstName}!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
            Welcome to your {businessData?.name} dashboard
          </p>
        </div>
      </div>

      {/* Role-based Stats Grid */}
      {loading || ((['admin', 'hr'].includes(user?.role)) && (usersLoading || departmentsLoading)) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-8 min-h-[200px] animate-pulse">
              <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                <div className="space-y-3 w-full">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mx-auto"></div>
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16 mx-auto"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : ['admin', 'hr'].includes(user?.role) ? (
        // Admin/HR Dashboard
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30">
                <UsersIcon className="h-12 w-12 text-blue-600 dark:text-blue-400 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Employees</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white dark:text-white">{stats.totalEmployees}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30">
                <BuildingOfficeIcon className="h-12 w-12 text-green-600 dark:text-green-400 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Departments</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white dark:text-white">{stats.totalDepartments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 dark:bg-yellow-900/30">
                <ClipboardDocumentListIcon className="h-12 w-12 text-yellow-600 dark:text-yellow-400 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Active Evaluations</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white dark:text-white">{stats.activeEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.completedEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Overdue</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.overdueEvaluations}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : ['manager', 'supervisor'].includes(user?.role) ? (
        // Manager Dashboard  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <UsersIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Team Evaluations</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.teamEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <UserIcon className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">My Evaluations</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.myEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <EyeIcon className="h-12 w-12 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pending Reviews</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.pendingReviews}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed This Month</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.completedThisMonth}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Overdue</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.overdueEvaluations}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        // Employee Dashboard
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                <PlayIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pending Evaluations</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.pendingEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <BookmarkIcon className="h-12 w-12 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Drafts Saved</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.draftsSaved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <ClockIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Awaiting Review</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.waitingForReview}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <StarIcon className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Current Rating</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.currentRating ? (
                    // Smart detection: if rating > 5, assume 10-point scale
                    stats.currentRating > 5 ? `${stats.currentRating}/10` : `${stats.currentRating}/5`
                  ) : 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-8 min-h-[200px]">
            <div className="flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex-shrink-0 p-4 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <TrophyIcon className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed This Year</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.completedThisYear}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
