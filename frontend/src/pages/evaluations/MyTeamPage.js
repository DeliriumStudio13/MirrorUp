import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import { fetchDepartments } from '../../store/slices/departmentSlice';
import { fetchEvaluations } from '../../store/slices/evaluationSlice';
// Note: Keeping assignment imports for potential future evaluation features
import {
  fetchEvaluationAssignments,
  selectEvaluationAssignments,
  selectEvaluationAssignmentsByEvaluator
} from '../../store/slices/assignmentSlice';

// Utils
import { formatDate } from '../../utils/dateUtils';

// Components
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Firebase
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

// Icons
import {
  UserGroupIcon,
  EyeIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  StarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon
} from '@heroicons/react/24/outline';

// Helper function to check nested department relationships
const isNestedSubordinate = (memberDept, targetDeptId, departments) => {
  let currentDept = memberDept;
  while (currentDept?.parentDepartment) {
    const parentDept = departments?.find(d => d.id === currentDept.parentDepartment);
    if (parentDept?.id === targetDeptId) {
      return true;
    }
    currentDept = parentDept;
  }
  return false;
};

const MyTeamPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { users, loading: usersLoading } = useSelector(state => state.users);
  const { departments } = useSelector(state => state.departments);
  const evaluationAssignments = useSelector(selectEvaluationAssignments);
  const myAssignments = useSelector(state => selectEvaluationAssignmentsByEvaluator(state, user?.uid || user?.id));
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersByDept, setTeamMembersByDept] = useState({});
  const [evaluations, setEvaluations] = useState([]);
  const [bonusAllocations, setBonusAllocations] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Pagination state for each department
  const [departmentPagination, setDepartmentPagination] = useState({});
  const [sortConfig, setSortConfig] = useState({});
  const ITEMS_PER_PAGE = 5;

  // Function to load bonus allocations
  const loadBonusAllocations = async () => {
    if (!user?.employeeInfo?.department) {
      setBonusAllocations({});
      return;
    }
    
    try {
      const currentYear = new Date().getFullYear();
      const allocationDoc = await getDoc(
        doc(db, 'bonusAllocations', `${user.employeeInfo.department}_${currentYear}`)
      );
      
      if (allocationDoc.exists()) {
        const data = allocationDoc.data();
        setBonusAllocations(data.allocations || {});
      } else {
        setBonusAllocations({});
      }
    } catch (error) {
      // Silently handle bonus allocation errors - this feature is optional
      if (!error.message.includes('permissions')) {
        console.warn('Bonus allocations not available:', error.message);
      }
      setBonusAllocations({});
    }
  };

  useEffect(() => {
    const loadTeamData = async () => {
      if (!user?.businessId) return;
      
      setLoading(true);
      
      try {
        // Load users, departments, and assignments
        await dispatch(fetchUsers(user.businessId));
        await dispatch(fetchDepartments(user.businessId));
        await dispatch(fetchEvaluationAssignments(user.businessId));
        
        // Load evaluations assigned by this manager
        const managerId = user?.uid || user?.id;
        if (managerId) {
          const evaluationResult = await dispatch(fetchEvaluations({
            businessId: user.businessId,
            filters: { evaluator: managerId }
          }));
          
          if (evaluationResult.payload) {
            setEvaluations(evaluationResult.payload.evaluations || []);
          }
        }
        
        // Load bonus allocations
        await loadBonusAllocations();
        
      } catch (error) {
        console.error('Error loading team data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [dispatch, user?.businessId]);

  // Refresh bonus allocations when component becomes visible (user returns from bonus page)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.employeeInfo?.department) {
        loadBonusAllocations();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.employeeInfo?.department]);

  useEffect(() => {
    if (users && user && departments) {
      // Get user's department
      const userDepartment = user?.employeeInfo?.department;
      
      if (!userDepartment) {
        setTeamMembers([]);
        setTeamMembersByDept({});
        return;
      }
      
      // Find departments that are under the user's department (or same level for head managers/directors)
      let relevantDepartments = [];
      
      if (user.role === 'admin' || user.role === 'hr') {
        // Admins and HR see all departments
        relevantDepartments = departments;
      } else if (user.role === 'head-manager') {
        // Head managers see their own department and any child departments
        const userDept = departments.find(d => d.id === userDepartment);
        if (userDept) {
          relevantDepartments = [userDept];
          // Add child departments
          const childDepts = departments.filter(d => d.parentDepartment === userDepartment);
          relevantDepartments = [...relevantDepartments, ...childDepts];
        }
      } else {
        // Managers and supervisors see their own department
        const userDept = departments.find(d => d.id === userDepartment);
        if (userDept) {
          relevantDepartments = [userDept];
        }
      }
      
      // Group team members by these departments
      const membersByDept = {};
      const allTeamMembers = [];
      
      relevantDepartments.forEach(dept => {
        const deptMembers = users.filter(u => {
          // Don't include self
          if (u.id === user.id) return false;
          
          // Include users from this department
          return u.employeeInfo?.department === dept.id;
        });
        
        if (deptMembers.length > 0) {
          // Sort members by name
          deptMembers.sort((a, b) => {
            const nameA = `${a.profile?.firstName || a.firstName} ${a.profile?.lastName || a.lastName}`;
            const nameB = `${b.profile?.firstName || b.firstName} ${b.profile?.lastName || b.lastName}`;
            return nameA.localeCompare(nameB);
          });
          
          membersByDept[dept.id] = {
            departmentId: dept.id,
            departmentName: dept.name,
            members: deptMembers
          };
          
          allTeamMembers.push(...deptMembers);
        }
      });
      
      setTeamMembers(allTeamMembers);
      setTeamMembersByDept(membersByDept);
    }
  }, [users, user, departments]);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'manager': return 'purple';
      case 'supervisor': return 'blue';
      case 'employee': return 'green';
      default: return 'gray';
    }
  };

  const getDepartmentName = (departmentId) => {
    const dept = departments?.find(d => d.id === departmentId);
    return dept?.name || 'Unknown Department';
  };

  // Evaluation helper functions
  const getEvaluationStatsForMember = (memberId) => {
    const memberEvaluations = evaluations.filter(e => e.evaluateeId === memberId);
    const pending = memberEvaluations.filter(e => e.status === 'pending').length;
    const inProgress = memberEvaluations.filter(e => e.status === 'in-progress').length;
    const underReview = memberEvaluations.filter(e => e.status === 'under-review').length;
    const completed = memberEvaluations.filter(e => e.status === 'completed').length;
    
    // Get the most recent completed evaluation for current rating
    const latestCompleted = memberEvaluations
      .filter(e => e.status === 'completed' && e.managerReview?.overallRating)
      .sort((a, b) => new Date(b.managerReview?.reviewedAt || b.submittedAt) - new Date(a.managerReview?.reviewedAt || a.submittedAt))[0];
    
    // Get any recent evaluation (for last evaluation date)
    const lastEvaluation = memberEvaluations
      .sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate))[0];
    
    // Determine max score (try to get from evaluation, fallback to default)
    let maxScore = 5; // Default
    if (latestCompleted?.scoringSystem === '1-10') {
      maxScore = 10;
    } else if (latestCompleted?.managerReview?.overallRating > 5) {
      maxScore = 10; // Infer 10-point scale
    }
    
    return {
      pending,
      inProgress,
      underReview,
      completed,
      total: memberEvaluations.length,
      currentRating: latestCompleted?.managerReview?.overallRating || null,
      maxScore,
      lastEvaluationDate: lastEvaluation ? formatDate(lastEvaluation.assignedDate) : null,
      lastCompletedDate: latestCompleted ? formatDate(latestCompleted.managerReview?.reviewedAt || latestCompleted.submittedAt) : null,
      hasActiveEvaluation: pending > 0 || inProgress > 0 || underReview > 0
    };
  };

  const getTeamStats = () => {
    const pendingReviews = evaluations.filter(e => e.status === 'under-review').length;
    const completedThisMonth = evaluations.filter(e => {
      if (e.status !== 'completed') return false;
      const completedDate = new Date(e.managerReview?.reviewedAt || e.submittedAt);
      const now = new Date();
      return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
    }).length;
    
    // Calculate average team rating
    const completedEvaluations = evaluations.filter(e => 
      e.status === 'completed' && e.managerReview?.overallRating
    );
    const avgRating = completedEvaluations.length > 0 
      ? (completedEvaluations.reduce((sum, evaluation) => sum + evaluation.managerReview.overallRating, 0) / completedEvaluations.length).toFixed(1)
      : null;
    
    return {
      pendingReviews,
      completedThisMonth,
      avgTeamRating: avgRating
    };
  };

  // Bonus allocation actions moved to dedicated Bonus Allocation page
  
  // Get bonus status for display
  const getBonusStatus = (evaluationStats) => {
    if (!evaluationStats.currentRating) {
      return { status: 'no-rating', message: 'No evaluation completed' };
    }
    
    const ratingPercent = evaluationStats.currentRating / evaluationStats.maxScore;
    
    if (ratingPercent >= 0.9) {
      return { status: 'excellent', message: 'Excellent performance', color: 'green' };
    } else if (ratingPercent >= 0.8) {
      return { status: 'good', message: 'Good performance', color: 'blue' };
    } else if (ratingPercent >= 0.7) {
      return { status: 'satisfactory', message: 'Satisfactory performance', color: 'yellow' };
    } else {
      return { status: 'below-expectations', message: 'Below expectations', color: 'red' };
    }
  };

  // Get department-specific stats
  const getDepartmentStats = (deptMembers) => {
    let pendingReviews = 0;
    let completedThisMonth = 0;
    let totalRatings = 0;
    let ratingCount = 0;

    deptMembers.forEach(member => {
      const stats = getEvaluationStatsForMember(member.id);
      pendingReviews += stats.pendingCount || 0;
      completedThisMonth += stats.completedThisMonth || 0;
      
      if (stats.latestScore && stats.latestScore > 0) {
        totalRatings += stats.latestScore;
        ratingCount++;
      }
    });

    return {
      totalMembers: deptMembers.length,
      pendingReviews,
      completedThisMonth,
      avgRating: ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : null
    };
  };

  // Sorting helpers
  const handleSort = (deptId, column) => {
    const currentSort = sortConfig[deptId];
    const isCurrentColumn = currentSort?.column === column;
    const newDirection = isCurrentColumn && currentSort.direction === 'asc' ? 'desc' : 'asc';
    
    setSortConfig(prev => ({
      ...prev,
      [deptId]: { column, direction: newDirection }
    }));
  };

  const getSortedMembers = (deptMembers, deptId) => {
    const currentSort = sortConfig[deptId];
    if (!currentSort) return deptMembers;

    const sortedMembers = [...deptMembers].sort((a, b) => {
      const aStats = getEvaluationStatsForMember(a.id);
      const bStats = getEvaluationStatsForMember(b.id);
      
      let aValue, bValue;
      
      switch (currentSort.column) {
        case 'rating':
          aValue = aStats.currentRating || 0;
          bValue = bStats.currentRating || 0;
          break;
        case 'lastEvaluation':
          aValue = aStats.lastCompletedDate ? new Date(aStats.lastCompletedDate).getTime() : 0;
          bValue = bStats.lastCompletedDate ? new Date(bStats.lastCompletedDate).getTime() : 0;
          break;
        case 'bonusPay':
          aValue = bonusAllocations[a.id]?.percentage || 0;
          bValue = bonusAllocations[b.id]?.percentage || 0;
          break;
        case 'status':
          const aStatusPriority = aStats.hasActiveEvaluation ? 2 : aStats.completed > 0 ? 1 : 0;
          const bStatusPriority = bStats.hasActiveEvaluation ? 2 : bStats.completed > 0 ? 1 : 0;
          aValue = aStatusPriority;
          bValue = bStatusPriority;
          break;
        default:
          return 0;
      }
      
      if (currentSort.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return sortedMembers;
  };

  // Pagination helpers
  const getCurrentPageForDept = (deptId) => {
    return departmentPagination[deptId]?.currentPage || 1;
  };

  const getPaginatedMembers = (deptMembers, deptId) => {
    const sortedMembers = getSortedMembers(deptMembers, deptId);
    const currentPage = getCurrentPageForDept(deptId);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedMembers.slice(startIndex, endIndex);
  };

  const getTotalPages = (memberCount) => {
    return Math.ceil(memberCount / ITEMS_PER_PAGE);
  };

  const setDepartmentPage = (deptId, page) => {
    setDepartmentPagination(prev => ({
      ...prev,
      [deptId]: { currentPage: page }
    }));
  };

  const getSortIcon = (deptId, column) => {
    const currentSort = sortConfig[deptId];
    if (!currentSort || currentSort.column !== column) {
      return <ChevronUpDownIcon className="h-4 w-4 inline ml-1 text-gray-400" />;
    }
    return currentSort.direction === 'asc' ? 
      <ChevronUpIcon className="h-4 w-4 inline ml-1 text-blue-600" /> : 
      <ChevronDownIcon className="h-4 w-4 inline ml-1 text-blue-600" />;
  };

  const teamStats = getTeamStats();

  if (loading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Team</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your team members and their evaluations
          </p>
        </div>
        <div className="flex space-x-3">
          <Link to="/team-performance">
            <Button variant="outline">
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Team Performance
            </Button>
          </Link>
        </div>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Team Members</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">{teamMembers.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentCheckIcon className="h-6 w-6 text-orange-400 dark:text-orange-300" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Pending Reviews</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {teamStats.pendingReviews}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400 dark:text-green-300" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Completed This Month</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {teamStats.completedThisMonth}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrophyIcon className="h-6 w-6 text-yellow-400 dark:text-yellow-300" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Avg Team Score</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {teamStats.avgTeamRating ? `${teamStats.avgTeamRating}/10` : '--'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members by Department */}
      {teamMembers.length === 0 ? (
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No team members found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {user?.role === 'admin' || user?.role === 'hr' 
                  ? "No users found in any department."
                  : user?.role === 'head-manager'
                    ? "No team members found in your department or sub-departments."
                    : "No team members found in your department."
                }
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Users may need to be assigned to departments or departments may not be set up yet.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(teamMembersByDept).map((department) => {
            const deptStats = getDepartmentStats(department.members);
            const currentPage = getCurrentPageForDept(department.departmentId);
            const totalPages = getTotalPages(department.members.length);
            const paginatedMembers = getPaginatedMembers(department.members, department.departmentId);
            
            return (
              <Card key={department.departmentId}>
                <div className="px-4 py-5 sm:p-6">
                  {/* Department Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        {department.departmentName}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {deptStats.totalMembers} team members
                        {totalPages > 1 && (
                          <span className="ml-2 text-gray-400 dark:text-gray-500">
                            • Page {currentPage} of {totalPages}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex space-x-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">{deptStats.pendingReviews}</div>
                        <div className="text-gray-500 dark:text-gray-400">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600 dark:text-green-400">{deptStats.completedThisMonth}</div>
                        <div className="text-gray-500 dark:text-gray-400">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {deptStats.avgRating ? `${deptStats.avgRating}/10` : '--'}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Avg Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Department Members Table */}
                  <div className="overflow-hidden shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                            Employee
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Department
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none transition-colors"
                            onClick={() => handleSort(department.departmentId, 'rating')}
                          >
                            <div className="flex items-center">
                              Current Rating
                              {getSortIcon(department.departmentId, 'rating')}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none transition-colors"
                            onClick={() => handleSort(department.departmentId, 'lastEvaluation')}
                          >
                            <div className="flex items-center">
                              Last Evaluation
                              {getSortIcon(department.departmentId, 'lastEvaluation')}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none transition-colors"
                            onClick={() => handleSort(department.departmentId, 'bonusPay')}
                          >
                            <div className="flex items-center">
                              Bonus Pay
                              {getSortIcon(department.departmentId, 'bonusPay')}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none transition-colors"
                            onClick={() => handleSort(department.departmentId, 'status')}
                          >
                            <div className="flex items-center">
                              Status
                              {getSortIcon(department.departmentId, 'status')}
                            </div>
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {paginatedMembers.map((member) => {
                    const evaluationStats = getEvaluationStatsForMember(member.id);
                    const bonusStatus = getBonusStatus(evaluationStats);
                    
                    return (
                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 bg-indigo-500 dark:bg-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {member.profile?.firstName?.[0] || member.firstName?.[0]}
                                  {member.profile?.lastName?.[0] || member.lastName?.[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.profile?.firstName || member.firstName} {member.profile?.lastName || member.lastName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {member.profile?.email || member.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white">{getDepartmentName(member.employeeInfo?.department)}</span>
                            <Badge color={getRoleBadgeColor(member.role)} className="mt-1 inline-flex w-fit">
                              {member.role}
                            </Badge>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {evaluationStats.currentRating ? (
                            <div className="flex items-center">
                              <TrophyIcon className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {evaluationStats.currentRating}/{evaluationStats.maxScore}
                              </span>
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({((evaluationStats.currentRating / evaluationStats.maxScore) * 100).toFixed(0)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No rating</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col">
                            {evaluationStats.lastCompletedDate ? (
                              <>
                                <span className="text-gray-900 dark:text-white">{evaluationStats.lastCompletedDate}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
                              </>
                            ) : evaluationStats.lastEvaluationDate ? (
                              <>
                                <span className="text-gray-900 dark:text-white">{evaluationStats.lastEvaluationDate}</span>
                                <span className="text-xs text-orange-500 dark:text-orange-400">Assigned</span>
                              </>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex items-center">
                            {(() => {
                              const memberBonus = bonusAllocations[member.id];
                              const bonusAmount = memberBonus ? 
                                (parseFloat(memberBonus.monthlySalary || 0) * parseFloat(memberBonus.bonusPercentage || 0) / 100) : 0;
                              
                              if (bonusAmount > 0) {
                                return (
                                  <div className="flex items-center">
                                    <CurrencyDollarIcon className="h-4 w-4 text-green-500 mr-1" />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        ${bonusAmount.toLocaleString()}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {memberBonus.bonusPercentage}% bonus
                                      </span>
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="flex items-center">
                                    <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                                    <div className="flex flex-col">
                                      <span className="text-gray-500 dark:text-gray-400 font-medium">No bonus</span>
                                      <span className="text-xs text-gray-400 dark:text-gray-500">Not allocated</span>
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {evaluationStats.hasActiveEvaluation ? (
                            <Badge color="orange">Active</Badge>
                          ) : evaluationStats.completed > 0 ? (
                            <Badge color="green">Evaluated</Badge>
                          ) : (
                            <Badge color="gray">No Evaluation</Badge>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex space-x-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Show member performance summary
                                const performanceSummary = `
Performance Summary for ${member.profile.firstName} ${member.profile.lastName}
Employee ID: ${member.employeeInfo.employeeId}
Position: ${member.employeeInfo.position}
Department: ${getDepartmentName(member.employeeInfo.department)}

Current Rating: ${evaluationStats.currentRating ? `${evaluationStats.currentRating}/${evaluationStats.maxScore}` : 'No rating'}
Completed Evaluations: ${evaluationStats.completed}
Last Evaluation: ${evaluationStats.lastCompletedDate || 'Never'}
Performance Status: ${bonusStatus.message}
                                `.trim();
                                alert(performanceSummary);
                              }}
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Show evaluation history
                                const memberEvals = evaluations.filter(e => e.evaluateeId === member.id);
                                if (memberEvals.length === 0) {
                                  alert(`No evaluations found for ${member.profile.firstName} ${member.profile.lastName}`);
                                  return;
                                }

                                const evalHistory = memberEvals
                                  .sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate))
                                  .map((evaluation, index) => {
                                    const assignedDate = formatDate(evaluation.assignedDate);
                                    const completedDate = evaluation.managerReview?.reviewedAt ? formatDate(evaluation.managerReview.reviewedAt) : evaluation.submittedAt ? formatDate(evaluation.submittedAt) : 'Not completed';
                                    const score = evaluation.managerReview?.overallRating || 'Not scored';
                                    return `${index + 1}. ${evaluation.templateName || 'Evaluation'} - Assigned: ${assignedDate}, Completed: ${completedDate}, Score: ${score}, Status: ${evaluation.status}`;
                                  })
                                  .join('\n');

                                alert(`Evaluation History for ${member.profile.firstName} ${member.profile.lastName}:\n\n${evalHistory}`);
                              }}
                              title="View Evaluations"
                            >
                              <DocumentCheckIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                        })}
                      </tbody>
                    </table>
                  </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setDepartmentPage(department.departmentId, Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setDepartmentPage(department.departmentId, Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                      {' '}to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * ITEMS_PER_PAGE, department.members.length)}
                      </span>
                      {' '}of{' '}
                      <span className="font-medium">{department.members.length}</span>
                      {' '}team members
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setDepartmentPage(department.departmentId, Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ←
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setDepartmentPage(department.departmentId, page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setDepartmentPage(department.departmentId, Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyTeamPage;

