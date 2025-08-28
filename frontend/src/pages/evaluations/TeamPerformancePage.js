import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import { fetchDepartments } from '../../store/slices/departmentSlice';
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
  UsersIcon,
  TrophyIcon,
  ChartBarIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  StarIcon
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
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'manager', 'supervisor', 'employee'
  
  useEffect(() => {
    const loadData = async () => {
      if (!user?.businessId) return;
      
      setLoading(true);
      
      try {
        // Load users and departments
        await dispatch(fetchUsers(user.businessId));
        await dispatch(fetchDepartments(user.businessId));
        
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
      } catch (error) {
        console.error('Error loading team performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dispatch, user?.businessId, user?.uid, user?.id]);

  useEffect(() => {
    if (users && user && departments) {
      // Filter team members based on hierarchical relationships
      let filteredUsers = [];
      
      if (user.role === 'manager' || user.role === 'head-manager') {
        // Managers and Head Managers see all users in their department and subordinate departments
        filteredUsers = users.filter(u => {
          // Don't include self
          if (u.id === user.id) return false;
          
          // Get user's department
          const userDept = departments?.find(d => d.id === user.employeeInfo?.department);
          const memberDept = departments?.find(d => d.id === u.employeeInfo?.department);
          
          if (!userDept || !memberDept) return false;
          
          // Include users in the same department with lower roles
          if (u.employeeInfo?.department === user.employeeInfo?.department) {
            return ['supervisor', 'employee'].includes(u.role);
          }
          
          // Include users from subordinate departments
          if (memberDept.parentDepartment === userDept.id) {
            return ['supervisor', 'employee'].includes(u.role);
          }
          
          // Include users from deeper nested departments
          if (isNestedSubordinate(memberDept, userDept.id, departments)) {
            return ['supervisor', 'employee'].includes(u.role);
          }
          
          return false;
        });
      } else if (user.role === 'supervisor') {
        // Supervisors see employees in their department and subordinate departments
        filteredUsers = users.filter(u => {
          // Don't include self
          if (u.id === user.id) return false;
          
          // Get supervisor's department
          const userDept = departments?.find(d => d.id === user.employeeInfo?.department);
          const memberDept = departments?.find(d => d.id === u.employeeInfo?.department);
          
          if (!userDept || !memberDept) return false;
          
          // Include employees in same department
          if (u.employeeInfo?.department === user.employeeInfo?.department && u.role === 'employee') {
            return true;
          }
          
          // Include employees from subordinate departments
          if (memberDept.parentDepartment === userDept.id && u.role === 'employee') {
            return true;
          }
          
          return false;
        });
      }

      setTeamMembers(filteredUsers);
    }
  }, [users, user, departments]);

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

  if (loading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" />
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
          <h1 className="text-2xl font-bold text-gray-900">Team Performance</h1>
          <p className="mt-1 text-sm text-gray-500">
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

      {/* Team Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrophyIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Team Average</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.averageScore ? 
                  `${metrics.averageScore.toFixed(1)}/${Math.round(metrics.averageMaxScore)}` : 
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
              <p className="text-sm font-medium text-gray-500">Team Members</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.evaluatedMembers}/{metrics.totalMembers}
              </p>
              <p className="text-xs text-gray-500">evaluated</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <StarIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Top Performers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.distribution.excellent}
              </p>
              <p className="text-xs text-gray-500">90%+ rating</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Need Support</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.distribution.needsImprovement}
              </p>
              <p className="text-xs text-gray-500">&lt;70% rating</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Year-over-Year Comparison */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Year-over-Year Comparison
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">{yearComparison.previousYear}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {yearComparison.previousAvg ? yearComparison.previousAvg.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-gray-500">Previous Year</p>
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
              <p className="text-xs text-gray-500">Change</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">{yearComparison.currentYear}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {yearComparison.currentAvg ? yearComparison.currentAvg.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-gray-500">Current Year</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Distribution */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Performance Distribution
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.distribution.excellent}</div>
              <div className="text-sm text-green-700 font-medium">Excellent</div>
              <div className="text-xs text-green-600">90-100%</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.distribution.good}</div>
              <div className="text-sm text-blue-700 font-medium">Good</div>
              <div className="text-xs text-blue-600">80-89%</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{metrics.distribution.satisfactory}</div>
              <div className="text-sm text-yellow-700 font-medium">Satisfactory</div>
              <div className="text-xs text-yellow-600">70-79%</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.distribution.needsImprovement}</div>
              <div className="text-sm text-red-700 font-medium">Needs Support</div>
              <div className="text-xs text-red-600">&lt;70%</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Individual Performance Table */}
      <Card>
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Individual Performance ({selectedYear})
          </h3>
          
          {metrics.memberStats.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">
                No team members match the current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Employee
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Department
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Current Rating
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Evaluations ({selectedYear})
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Last Evaluation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {metrics.memberStats
                    .sort((a, b) => {
                      // Sort by rating descending, then by name
                      if (a.stats.currentRating && b.stats.currentRating) {
                        return b.stats.currentRating - a.stats.currentRating;
                      }
                      if (a.stats.currentRating) return -1;
                      if (b.stats.currentRating) return 1;
                      return (a.profile?.firstName || a.firstName || '').localeCompare(b.profile?.firstName || b.firstName || '');
                    })
                    .map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {member.profile?.firstName?.[0] || member.firstName?.[0]}
                                  {member.profile?.lastName?.[0] || member.lastName?.[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.profile?.firstName || member.firstName} {member.profile?.lastName || member.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.profile?.email || member.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex flex-col">
                            <span className="text-gray-900">{getDepartmentName(member.employeeInfo?.department)}</span>
                            <Badge color={getRoleBadgeColor(member.role)} className="mt-1 inline-flex w-fit">
                              {member.role}
                            </Badge>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {member.stats.currentRating ? (
                            <div className="flex items-center">
                              <TrophyIcon className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="font-medium text-gray-900">
                                {member.stats.currentRating}/{member.stats.maxScore}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                ({((member.stats.currentRating / member.stats.maxScore) * 100).toFixed(0)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No rating</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="text-gray-900">{member.stats.completedCount}/{member.stats.totalCount}</span>
                          <span className="text-xs text-gray-500 ml-1">completed</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {member.stats.lastCompletedDate || <span className="text-gray-400">Never</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TeamPerformancePage;