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
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  StarIcon,
  BookmarkIcon,
  UserIcon,
  PlayIcon,
  EyeIcon,
  CogIcon,
  AcademicCapIcon
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

  // Get recent evaluations based on role
  const getRecentEvaluations = () => {
    if (['employee'].includes(user?.role)) {
      // Employees see their own evaluations
      return evaluations
        .filter(e => e.evaluateeId === (user.uid || user.id))
        .sort((a, b) => new Date(b.createdAt || b.assignedDate) - new Date(a.createdAt || a.assignedDate))
        .slice(0, 5);
    } else {
      // Managers/Admins see recent evaluations they're involved with
      return evaluations
        .sort((a, b) => new Date(b.createdAt || b.assignedDate) - new Date(a.createdAt || a.assignedDate))
        .slice(0, 5);
    }
  };

  const recentEvaluations = getRecentEvaluations();

  // Role-based quick actions
  const getQuickActions = () => {
    if (['admin', 'hr'].includes(user?.role)) {
      return [
        {
          name: 'Add Employee',
          href: '/users/create',
          icon: UsersIcon,
          color: 'bg-blue-500'
        },
        {
          name: 'Create Evaluation',
          href: '/evaluations/assign',
          icon: ClipboardDocumentListIcon,
          color: 'bg-green-500'
        },
        {
          name: 'Manage Departments',
          href: '/departments',
          icon: BuildingOfficeIcon,
          color: 'bg-orange-500'
        },
        {
          name: 'View Analytics',
          href: '/analytics',
          icon: ChartBarIcon,
          color: 'bg-purple-500'
        }
      ];
    } else if (['manager', 'supervisor'].includes(user?.role)) {
      return [
        {
          name: 'Assign Evaluation',
          href: '/evaluations/assign',
          icon: ClipboardDocumentListIcon,
          color: 'bg-green-500'
        },
        {
          name: 'Review Evaluations',
          href: '/evaluations/review',
          icon: EyeIcon,
          color: 'bg-blue-500'
        },
        {
          name: 'My Team',
          href: '/my-team',
          icon: UsersIcon,
          color: 'bg-purple-500'
        },
        {
          name: 'My Evaluations',
          href: '/evaluations/my-evaluations',
          icon: UserIcon,
          color: 'bg-orange-500'
        }
      ];
    } else {
      // Employee actions
      const pendingCount = stats.pendingEvaluations || 0;
      const draftCount = stats.draftsSaved || 0;
      
      return [
        {
          name: pendingCount > 0 ? `Start Evaluation (${pendingCount})` : 'My Evaluations',
          href: pendingCount > 0 ? '/evaluations/pending' : '/evaluations/my-evaluations',
          icon: pendingCount > 0 ? PlayIcon : ClipboardDocumentListIcon,
          color: pendingCount > 0 ? 'bg-green-500' : 'bg-blue-500'
        },
        {
          name: draftCount > 0 ? `Continue Draft (${draftCount})` : 'View My Results',
          href: draftCount > 0 ? '/evaluations/pending' : '/evaluations/my-evaluations',
          icon: draftCount > 0 ? BookmarkIcon : TrophyIcon,
          color: draftCount > 0 ? 'bg-orange-500' : 'bg-purple-500'
        },
        {
          name: 'My Performance',
          href: '/evaluations/my-evaluations',
          icon: AcademicCapIcon,
          color: 'bg-indigo-500'
        },
        {
          name: 'Settings',
          href: '/settings',
          icon: CogIcon,
          color: 'bg-gray-500'
        }
      ];
    }
  };

  const quickActions = getQuickActions();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.profile?.firstName}!
          </h1>
          <p className="text-gray-600">
            Welcome to your {businessData?.name} dashboard
          </p>
        </div>
      </div>

      {/* Role-based Stats Grid */}
      {loading || ((['admin', 'hr'].includes(user?.role)) && (usersLoading || departmentsLoading)) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-gray-300 rounded"></div>
                </div>
                <div className="ml-3 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                  <div className="h-6 bg-gray-300 rounded w-8"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : ['admin', 'hr'].includes(user?.role) ? (
        // Admin/HR Dashboard
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Employees</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Departments</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDepartments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentListIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active Evaluations</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completedEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.overdueEvaluations}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : ['manager', 'supervisor'].includes(user?.role) ? (
        // Manager Dashboard  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Team Evaluations</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.teamEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">My Evaluations</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.myEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingReviews}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Completed This Month</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completedThisMonth}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.overdueEvaluations}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        // Employee Dashboard
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pending Evaluations</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingEvaluations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookmarkIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Drafts Saved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.draftsSaved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Awaiting Review</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.waitingForReview}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <StarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Current Rating</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.currentRating ? (
                    // Smart detection: if rating > 5, assume 10-point scale
                    stats.currentRating > 5 ? `${stats.currentRating}/10` : `${stats.currentRating}/5`
                  ) : 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrophyIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Completed This Year</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completedThisYear}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <Card.Header title="Quick Actions" />
            <Card.Body>
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.name}
                    to={action.href}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`flex-shrink-0 p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600">
                        {action.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Role-based Recent/Activity Section */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header 
              title={
                user?.role === 'employee' ? 'My Evaluations' : 
                ['manager', 'supervisor'].includes(user?.role) ? 'Recent Activity' : 
                'Recent Evaluations'
              } 
              action={
                <Link 
                  to={
                    user?.role === 'employee' ? '/evaluations/my-evaluations' :
                    ['manager', 'supervisor'].includes(user?.role) ? '/my-team' :
                    '/evaluations'
                  } 
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  View all
                </Link>
              }
            />
            <Card.Body>
              {recentEvaluations.length > 0 ? (
                <div className="space-y-4">
                  {recentEvaluations.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user?.role === 'employee' ? evaluation.templateName?.charAt(0) || 'E' :
                               evaluation.evaluateeName?.split(' ').map(n => n[0]).join('') || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {user?.role === 'employee' ? 
                              evaluation.templateName : 
                              evaluation.evaluateeName || 'Loading...'
                            }
                          </p>
                          <div className="flex items-center text-sm text-gray-500">
                            {evaluation.status === 'completed' ? (
                              <>
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Completed on {formatDate(evaluation.managerReview?.reviewedAt || evaluation.submittedAt)}
                              </>
                            ) : evaluation.status === 'under-review' ? (
                              <>
                                <ClockIcon className="h-4 w-4 mr-1" />
                                Under review
                              </>
                            ) : evaluation.status === 'in-progress' ? (
                              <>
                                <BookmarkIcon className="h-4 w-4 mr-1" />
                                Draft saved
                              </>
                            ) : (
                              <>
                                <ClockIcon className="h-4 w-4 mr-1" />
                                Due {formatDate(evaluation.dueDate)}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {evaluation.status === 'completed' && evaluation.managerReview?.overallRating && (
                          <div className="flex items-center">
                            <TrophyIcon className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="text-sm font-medium text-gray-900">
                              {evaluation.managerReview.overallRating}/{evaluation.maxScore || 5}
                            </span>
                          </div>
                        )}
                        <Badge.Status status={evaluation.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {user?.role === 'employee' ? 'No evaluations assigned' : 'No recent activity'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {user?.role === 'employee' ? 
                      'Your manager will assign evaluations when it\'s time for your review.' :
                      (usersLoading || departmentsLoading) ? 
                        'Loading dashboard data...' :
                        'Get started by creating your first evaluation.'
                    }
                  </p>
                  {!['employee'].includes(user?.role) && (
                    <div className="mt-3">
                      <Link
                        to="/evaluations/assign"
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Assign Evaluation
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
