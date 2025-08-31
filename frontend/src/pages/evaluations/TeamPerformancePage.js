import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchUsers, selectUsersInitialized } from '../../store/slices/userSlice';
import { fetchDepartments, selectDepartmentsInitialized } from '../../store/slices/departmentSlice';
import { fetchEvaluations, selectEvaluationsInitialized } from '../../store/slices/evaluationSlice';

// Firebase
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

// Utils
import { formatDate } from '../../utils/dateUtils';

// Components
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Icons
import {
  UsersIcon,
  TrophyIcon,
  ChartBarIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  StarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  PresentationChartLineIcon,
  ChevronDownIcon,
  ChevronRightIcon
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

const TeamPerformancePage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { users, loading: usersLoading } = useSelector(state => state.users);
  const { departments } = useSelector(state => state.departments);
  const usersInitialized = useSelector(selectUsersInitialized);
  const departmentsInitialized = useSelector(selectDepartmentsInitialized);
  const evaluationsInitialized = useSelector(selectEvaluationsInitialized);
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersByDept, setTeamMembersByDept] = useState({});
  const [evaluations, setEvaluations] = useState([]);
  const [bonusAllocations, setBonusAllocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'manager', 'supervisor', 'employee'
  const [expandedDepartments, setExpandedDepartments] = useState({}); // Track which departments are expanded
  
  // Toggle department expansion
  const toggleDepartmentExpansion = (deptId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };
  
  // Load bonus allocations for team members
  const loadBonusAllocations = async (memberDepartments) => {
    try {
      const currentYear = new Date().getFullYear();
      const allocations = {};
      
      // Load bonus allocations for each unique department
      const uniqueDepartments = [...new Set(memberDepartments)];
      
      for (const deptId of uniqueDepartments) {
        try {
          // 🚀 NEW: Use subcollection path (assuming bonusAllocations maps to bonusCalculations)
          const allocationDoc = await getDoc(
            doc(db, 'businesses', user.businessId, 'bonusCalculations', `${deptId}_${currentYear}`)
          );
          
          if (allocationDoc.exists()) {
            const deptAllocations = allocationDoc.data().allocations || {};
            Object.assign(allocations, deptAllocations);
          }
        } catch (error) {
          console.log(`No bonus allocation found for department ${deptId}:`, error.message);
        }
      }
      
      setBonusAllocations(allocations);
    } catch (error) {
      console.log('Error loading bonus allocations:', error.message);
      setBonusAllocations({});
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.businessId) {
        console.log('No business ID available, waiting...');
        return;
      }
      
      setLoading(true);
      
      try {
        console.log('🔄 Loading team performance data for business:', user.businessId);
        
        // Load evaluations assigned by this manager
        const managerId = user.id;
        if (managerId) {
          console.log('📊 Fetching evaluations for manager:', managerId);
          const evaluationResult = await dispatch(fetchEvaluations({
            businessId: user.businessId,
            filters: { evaluator: managerId }
          })).unwrap();
          
          console.log('✅ Evaluations loaded:', evaluationResult?.evaluations?.length || 0);
          setEvaluations(evaluationResult?.evaluations || []);
        }
      } catch (error) {
        console.error('❌ Error loading team performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only load data if we have all required data from the store
    if (user?.businessId && usersInitialized && departmentsInitialized && evaluationsInitialized) {
      console.log('🔄 Dependencies loaded, fetching team performance data...');
      loadData();
    } else {
      console.log('⏳ Waiting for dependencies...', { 
        businessId: user?.businessId,
        usersInitialized,
        departmentsInitialized,
        evaluationsInitialized
      });
    }
  }, [dispatch, user?.businessId, user?.id, usersInitialized, departmentsInitialized, evaluationsInitialized]);

  useEffect(() => {
    if (!user?.businessId || !usersInitialized || !departmentsInitialized || !users?.length || !departments?.length) {
      return;
    }

    // Filter team members based on hierarchical relationships
    let filteredUsers = [];
    let relevantDepartments = [];
    
    if (user.role === 'admin' || user.role === 'hr') {
      // Admin and HR can see all departments
      relevantDepartments = departments;
      filteredUsers = users.filter(u => u.id !== user.id);
    } else if (user.role === 'head-manager') {
      // Head managers see their own department and all child departments
      const userDept = departments?.find(d => d.id === user.employeeInfo?.department);
      if (userDept) {
        relevantDepartments = [userDept];
        // Add all child departments recursively
        const addChildDepartments = (parentId) => {
          const children = departments.filter(d => d.parentDepartment === parentId);
          relevantDepartments.push(...children);
          children.forEach(child => addChildDepartments(child.id));
        };
        addChildDepartments(userDept.id);
      }
      
      // Filter users to only include those in relevant departments
      filteredUsers = users.filter(u => {
        if (u.id === user.id) return false;
        return relevantDepartments.some(dept => dept.id === u.employeeInfo?.department);
      });
    } else if (user.role === 'manager') {
      // Managers see their own department
      const userDept = departments?.find(d => d.id === user.employeeInfo?.department);
      if (userDept) {
        relevantDepartments = [userDept];
      }
      
      filteredUsers = users.filter(u => {
        if (u.id === user.id) return false;
        return u.employeeInfo?.department === user.employeeInfo?.department;
      });
    }

    // Group users by department
    const membersByDept = {};
    relevantDepartments.forEach(dept => {
      const deptMembers = filteredUsers.filter(u => u.employeeInfo?.department === dept.id);
      if (deptMembers.length > 0) {
        membersByDept[dept.id] = {
          department: dept,
          members: deptMembers
        };
      }
    });

    console.log('🔄 Setting team members:', { 
      filteredUsers: filteredUsers.length,
      departments: Object.keys(membersByDept).length
    });

    setTeamMembers(filteredUsers);
    setTeamMembersByDept(membersByDept);
    
    // Load bonus allocations for all member departments
    const memberDepartments = filteredUsers.map(u => u.employeeInfo?.department).filter(Boolean);
    if (memberDepartments.length > 0) {
      loadBonusAllocations(memberDepartments);
    }
  }, [user?.businessId, users, departments, usersInitialized, departmentsInitialized]);

  // Helper functions
  const getEvaluationStatsForMember = (memberId) => {
    const memberEvaluations = evaluations.filter(e => e.evaluateeId === memberId);
    
    // Filter by selected year
    const yearEvaluations = memberEvaluations.filter(e => {
      const evalYear = new Date(e.assignedDate).getFullYear();
      return evalYear === selectedYear;
    });
    
    // Get the most recent completed evaluation for current rating
    const latestCompleted = yearEvaluations
      .filter(e => e.status === 'completed' && e.managerReview?.overallRating)
      .sort((a, b) => new Date(b.managerReview?.reviewedAt || b.submittedAt) - new Date(a.managerReview?.reviewedAt || a.submittedAt))[0];
    
    // Determine max score (try to get from evaluation, fallback to default)
    let maxScore = 5; // Default
    if (latestCompleted?.scoringSystem === '1-10') {
      maxScore = 10;
    } else if (latestCompleted?.managerReview?.overallRating > 5) {
      maxScore = 10; // Infer 10-point scale
    }
    
    return {
      currentRating: latestCompleted?.managerReview?.overallRating || null,
      maxScore,
      completedCount: yearEvaluations.filter(e => e.status === 'completed').length,
      totalCount: yearEvaluations.length,
      lastCompletedDate: latestCompleted ? formatDate(latestCompleted.managerReview?.reviewedAt || latestCompleted.submittedAt) : null,
    };
  };

  const getDepartmentName = (departmentId) => {
    const dept = departments?.find(d => d.id === departmentId);
    return dept?.name || 'Unknown Department';
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'manager': return 'purple';
      case 'supervisor': return 'blue';
      case 'employee': return 'green';
      default: return 'gray';
    }
  };

  // Calculate department-level performance metrics
  const getDepartmentPerformanceMetrics = (departmentData) => {
    const { members } = departmentData;
    
    // Filter by role if selected
    let filteredMembers = members;
    if (roleFilter !== 'all') {
      filteredMembers = members.filter(member => member.role === roleFilter);
    }

    const memberStats = filteredMembers.map(member => ({
      ...member,
      stats: getEvaluationStatsForMember(member.id)
    }));

    // Calculate overall metrics
    const membersWithRatings = memberStats.filter(m => m.stats.currentRating !== null);
    const totalMembers = filteredMembers.length;
    const evaluatedMembers = membersWithRatings.length;
    
    const averageScore = evaluatedMembers > 0 
      ? membersWithRatings.reduce((sum, m) => sum + m.stats.currentRating, 0) / evaluatedMembers 
      : null;

    const averageMaxScore = evaluatedMembers > 0
      ? membersWithRatings.reduce((sum, m) => sum + m.stats.maxScore, 0) / evaluatedMembers
      : 10;

    // Performance distribution
    const excellent = membersWithRatings.filter(m => (m.stats.currentRating / m.stats.maxScore) >= 0.9).length;
    const good = membersWithRatings.filter(m => {
      const ratio = m.stats.currentRating / m.stats.maxScore;
      return ratio >= 0.8 && ratio < 0.9;
    }).length;
    const satisfactory = membersWithRatings.filter(m => {
      const ratio = m.stats.currentRating / m.stats.maxScore;
      return ratio >= 0.7 && ratio < 0.8;
    }).length;
    const needsImprovement = membersWithRatings.filter(m => (m.stats.currentRating / m.stats.maxScore) < 0.7).length;

    // Calculate total bonus amount for department
    const totalBonus = filteredMembers.reduce((sum, member) => {
      const memberBonus = bonusAllocations[member.id];
      if (memberBonus && memberBonus.monthlySalary && memberBonus.bonusPercentage) {
        const bonusAmount = parseFloat(memberBonus.monthlySalary) * parseFloat(memberBonus.bonusPercentage) / 100;
        return sum + bonusAmount;
      }
      return sum;
    }, 0);

    const averageBonus = totalMembers > 0 ? totalBonus / totalMembers : 0;

    return {
      totalMembers,
      evaluatedMembers,
      averageScore,
      averageMaxScore,
      memberStats,
      totalBonus,
      averageBonus,
      distribution: {
        excellent,
        good,
        satisfactory,
        needsImprovement
      }
    };
  };

  // Calculate team performance metrics
  const getTeamPerformanceMetrics = () => {
    // Filter by role if selected
    let filteredMembers = teamMembers;
    if (roleFilter !== 'all') {
      filteredMembers = teamMembers.filter(member => member.role === roleFilter);
    }

    const memberStats = filteredMembers.map(member => ({
      ...member,
      stats: getEvaluationStatsForMember(member.id)
    }));

    // Calculate overall metrics
    const membersWithRatings = memberStats.filter(m => m.stats.currentRating !== null);
    const totalMembers = filteredMembers.length;
    const evaluatedMembers = membersWithRatings.length;
    
    const averageScore = evaluatedMembers > 0 
      ? membersWithRatings.reduce((sum, m) => sum + m.stats.currentRating, 0) / evaluatedMembers 
      : null;

    const averageMaxScore = evaluatedMembers > 0
      ? membersWithRatings.reduce((sum, m) => sum + m.stats.maxScore, 0) / evaluatedMembers
      : 10;

    // Performance distribution
    const excellent = membersWithRatings.filter(m => (m.stats.currentRating / m.stats.maxScore) >= 0.9).length;
    const good = membersWithRatings.filter(m => {
      const ratio = m.stats.currentRating / m.stats.maxScore;
      return ratio >= 0.8 && ratio < 0.9;
    }).length;
    const satisfactory = membersWithRatings.filter(m => {
      const ratio = m.stats.currentRating / m.stats.maxScore;
      return ratio >= 0.7 && ratio < 0.8;
    }).length;
    const needsImprovement = membersWithRatings.filter(m => (m.stats.currentRating / m.stats.maxScore) < 0.7).length;

    return {
      totalMembers,
      evaluatedMembers,
      averageScore,
      averageMaxScore,
      memberStats,
      distribution: {
        excellent,
        good,
        satisfactory,
        needsImprovement
      }
    };
  };

  // Get year comparison
  const getYearComparison = () => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    // Get evaluations for both years
    const currentYearEvals = evaluations.filter(e => {
      const evalYear = new Date(e.assignedDate).getFullYear();
      return evalYear === currentYear && e.status === 'completed' && e.managerReview?.overallRating;
    });
    
    const previousYearEvals = evaluations.filter(e => {
      const evalYear = new Date(e.assignedDate).getFullYear();
      return evalYear === previousYear && e.status === 'completed' && e.managerReview?.overallRating;
    });

    const currentAvg = currentYearEvals.length > 0 
      ? currentYearEvals.reduce((sum, e) => sum + e.managerReview.overallRating, 0) / currentYearEvals.length 
      : null;
      
    const previousAvg = previousYearEvals.length > 0 
      ? previousYearEvals.reduce((sum, e) => sum + e.managerReview.overallRating, 0) / previousYearEvals.length 
      : null;

    let trend = 'stable';
    let change = 0;
    
    if (currentAvg !== null && previousAvg !== null) {
      change = currentAvg - previousAvg;
      if (change > 0.2) trend = 'up';
      else if (change < -0.2) trend = 'down';
    }

    return {
      currentYear,
      previousYear,
      currentAvg,
      previousAvg,
      trend,
      change
    };
  };

  const metrics = getTeamPerformanceMetrics();
  const yearComparison = getYearComparison();
  
  // Get all department metrics
  const departmentMetrics = Object.keys(teamMembersByDept).reduce((acc, deptId) => {
    acc[deptId] = getDepartmentPerformanceMetrics(teamMembersByDept[deptId]);
    return acc;
  }, {});

  // Check if all required data is initialized
  if (!usersInitialized || !departmentsInitialized || !evaluationsInitialized || loading || usersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading team performance data...</p>
        <div className="mt-2 text-sm text-gray-500">
          {!usersInitialized && <p>• Loading users...</p>}
          {!departmentsInitialized && <p>• Loading departments...</p>}
          {!evaluationsInitialized && <p>• Loading evaluations...</p>}
          {loading && <p>• Processing data...</p>}
        </div>
      </div>
    );
  }

  const availableYears = Array.from(
    new Set(evaluations.map(e => new Date(e.assignedDate).getFullYear()))
  ).sort((a, b) => b - a);

  const roleOptions = [
    { value: 'all', label: 'All Roles', count: teamMembers.length },
    { value: 'manager', label: 'Managers', count: teamMembers.filter(m => m.role === 'manager').length },
    { value: 'supervisor', label: 'Supervisors', count: teamMembers.filter(m => m.role === 'supervisor').length },
    { value: 'employee', label: 'Employees', count: teamMembers.filter(m => m.role === 'employee').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Performance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor your team's performance and evaluation progress
          </p>
        </div>
        <div className="flex space-x-3">
          <Link to="/my-team">
            <Button variant="outline">
              <UsersIcon className="h-4 w-4 mr-2" />
              View My Team
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Year Selector */}
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
                {availableYears.length === 0 && (
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                )}
              </select>
            </div>
          </div>
        </Card>

        {/* Role Filter */}
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Department Performance Sections */}
      {Object.keys(teamMembersByDept).length === 0 ? (
        <Card>
          <div className="p-6 text-center">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No departments found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No team members or departments match the current filters.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.keys(teamMembersByDept).map(deptId => {
            const deptData = teamMembersByDept[deptId];
            const deptMetrics = departmentMetrics[deptId];
            
            return (
              <div key={deptId} className="space-y-6">
                {/* Department Header - Clickable */}
                <div 
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 cursor-pointer hover:shadow-md dark:hover:shadow-gray-900/30 transition-shadow duration-200"
                  onClick={() => toggleDepartmentExpansion(deptId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BuildingOfficeIcon className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {deptData.department.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Department Performance Overview • {selectedYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {deptMetrics.evaluatedMembers}/{deptMetrics.totalMembers} evaluated
                      </span>
                      {/* Expand/Collapse Icon */}
                      <div className="transition-transform duration-200">
                        {expandedDepartments[deptId] ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Department Content */}
                {expandedDepartments[deptId] && (
                  <div className="space-y-6">
                        {/* Department Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <Card className="p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrophyIcon className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Performance</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {deptMetrics.averageScore ? 
                            `${deptMetrics.averageScore.toFixed(1)}/${Math.round(deptMetrics.averageMaxScore)}` : 
                            '--'
                          }
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UsersIcon className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Team Size</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {deptMetrics.totalMembers}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">members</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <StarIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Performers</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {deptMetrics.distribution.excellent}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">90%+ rating</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CurrencyDollarIcon className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bonus</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          ${deptMetrics.totalBonus.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">allocated</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <PresentationChartLineIcon className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Dept KPI</p>
                        <p className="text-lg font-semibold text-gray-400">
                          Coming Soon
                        </p>
                        <p className="text-xs text-gray-400">feature</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Department Performance Distribution */}
                <Card>
                  <div className="p-6">
                    <h4 className="text-md leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      {deptData.department.name} Performance Distribution
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{deptMetrics.distribution.excellent}</div>
                        <div className="text-sm text-green-700 dark:text-green-300 font-medium">Excellent</div>
                        <div className="text-xs text-green-600 dark:text-green-400">90-100%</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{deptMetrics.distribution.good}</div>
                        <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Good</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">80-89%</div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{deptMetrics.distribution.satisfactory}</div>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Satisfactory</div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400">70-79%</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{deptMetrics.distribution.needsImprovement}</div>
                        <div className="text-sm text-red-700 dark:text-red-300 font-medium">Needs Support</div>
                        <div className="text-xs text-red-600 dark:text-red-400">&lt;70%</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Department Members Table */}
                <Card>
                                      <div className="px-4 py-5 sm:p-6">
                    <h4 className="text-md leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      {deptData.department.name} Team Members ({selectedYear})
                    </h4>
                    
                    <div className="overflow-hidden shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                              Employee
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              Current Rating
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              Evaluations ({selectedYear})
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              Bonus Amount
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              Last Evaluation
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                          {deptMetrics.memberStats
                            .sort((a, b) => {
                              // Sort by rating descending, then by name
                              if (a.stats.currentRating && b.stats.currentRating) {
                                return b.stats.currentRating - a.stats.currentRating;
                              }
                              if (a.stats.currentRating) return -1;
                              if (b.stats.currentRating) return 1;
                              return (a.profile?.firstName || a.firstName || '').localeCompare(b.profile?.firstName || b.firstName || '');
                            })
                            .map((member) => {
                              const memberBonus = bonusAllocations[member.id];
                              const bonusAmount = memberBonus ? 
                                (parseFloat(memberBonus.monthlySalary || 0) * parseFloat(memberBonus.bonusPercentage || 0) / 100) : 0;
                              
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
                                          <Badge color={getRoleBadgeColor(member.role)} className="inline-flex">
                                            {member.role}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    {member.stats.currentRating ? (
                                      <div className="flex items-center">
                                        <TrophyIcon className="h-4 w-4 text-yellow-400 mr-1" />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                          {member.stats.currentRating}/{member.stats.maxScore}
                                        </span>
                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                          ({((member.stats.currentRating / member.stats.maxScore) * 100).toFixed(0)}%)
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500">No rating</span>
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="text-gray-900 dark:text-white">{member.stats.completedCount}/{member.stats.totalCount}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">completed</span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    {bonusAmount > 0 ? (
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
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500">No bonus</span>
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    {member.stats.lastCompletedDate || <span className="text-gray-400">Never</span>}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </Card>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Overall Year-over-Year Summary */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Organization-wide Year-over-Year Performance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{yearComparison.previousYear}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {yearComparison.previousAvg ? yearComparison.previousAvg.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Previous Year Average</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {yearComparison.trend === 'up' && (
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-500" />
                )}
                {yearComparison.trend === 'down' && (
                  <ArrowTrendingDownIcon className="h-6 w-6 text-red-500" />
                )}
                {yearComparison.trend === 'stable' && (
                  <MinusIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <p className="text-lg font-semibold">
                {yearComparison.change > 0 ? '+' : ''}{yearComparison.change.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {yearComparison.trend === 'up' ? 'Improvement' : yearComparison.trend === 'down' ? 'Decline' : 'Stable'}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{yearComparison.currentYear}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {yearComparison.currentAvg ? yearComparison.currentAvg.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Year Average</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TeamPerformancePage;