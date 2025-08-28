import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

// Redux
import { selectUser } from '../../store/slices/authSlice';
import { fetchUsers, fixDepartmentCounts } from '../../store/slices/userSlice';
import { fetchDepartments } from '../../store/slices/departmentSlice';
import { fetchEvaluations } from '../../store/slices/evaluationSlice';

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
  PlusIcon,
  EyeIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  StarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon
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
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [bonusAllocations, setBonusAllocations] = useState({});
  const [loading, setLoading] = useState(true);

  // Function to load bonus allocations
  const loadBonusAllocations = async () => {
    if (!user?.employeeInfo?.department) return;
    
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
      console.error('Error loading bonus allocations:', error);
      setBonusAllocations({});
    }
  };

  useEffect(() => {
    const loadTeamData = async () => {
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
        
        // Load bonus allocations
        await loadBonusAllocations();
        
        // Fix department counts (one-time fix for existing data)
        await dispatch(fixDepartmentCounts(user.businessId));
        
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
          
          // Include users from subordinate departments (departments where this user's dept is parent)
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

  // Check if user has access to bonus allocation
  const hasAccessToBonusAllocation = user?.role === 'head-manager';
  
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
          <h1 className="text-2xl font-bold text-gray-900">My Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your team members and their evaluations
          </p>
        </div>
        <div className="flex space-x-3">
          <Link to="/assign-evaluations">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <PlusIcon className="h-4 w-4 mr-2" />
              Assign Evaluation
            </Button>
          </Link>
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
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Team Members</dt>
                  <dd className="text-lg font-medium text-gray-900">{teamMembers.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentCheckIcon className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Reviews</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {teamStats.pendingReviews}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed This Month</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {teamStats.completedThisMonth}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrophyIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Team Score</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {teamStats.avgTeamRating ? `${teamStats.avgTeamRating}/10` : '--'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <Card>
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Team Members ({teamMembers.length})
          </h3>
          
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">
                {(user.role === 'manager' || user.role === 'head-manager')
                  ? "You don't have any supervisors or employees assigned yet."
                  : "You don't have any employees assigned yet."
                }
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
                      Last Evaluation
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Bonus Pay
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {teamMembers.map((member) => {
                    const evaluationStats = getEvaluationStatsForMember(member.id);
                    const bonusStatus = getBonusStatus(evaluationStats);
                    
                    return (
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
                          {evaluationStats.currentRating ? (
                            <div className="flex items-center">
                              <TrophyIcon className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="font-medium text-gray-900">
                                {evaluationStats.currentRating}/{evaluationStats.maxScore}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                ({((evaluationStats.currentRating / evaluationStats.maxScore) * 100).toFixed(0)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No rating</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex flex-col">
                            {evaluationStats.lastCompletedDate ? (
                              <>
                                <span className="text-gray-900">{evaluationStats.lastCompletedDate}</span>
                                <span className="text-xs text-gray-500">Completed</span>
                              </>
                            ) : evaluationStats.lastEvaluationDate ? (
                              <>
                                <span className="text-gray-900">{evaluationStats.lastEvaluationDate}</span>
                                <span className="text-xs text-orange-500">Assigned</span>
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
                                      <span className="font-medium text-gray-900">
                                        ${bonusAmount.toLocaleString()}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {memberBonus.bonusPercentage}% bonus
                                      </span>
                                      {hasAccessToBonusAllocation && (
                                        <Link to="/bonus-allocation" className="text-xs text-indigo-600 hover:text-indigo-800">
                                          Modify
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                );
                              } else if (hasAccessToBonusAllocation) {
                                return (
                                  <Link to="/bonus-allocation" className="flex items-center text-indigo-600 hover:text-indigo-900">
                                    <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                    <div className="flex flex-col">
                                      <span className="font-medium">Allocate Bonus</span>
                                      <span className="text-xs">Click to set</span>
                                    </div>
                                  </Link>
                                );
                              } else {
                                return (
                                  <div className="flex items-center">
                                    <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                                    <div className="flex flex-col">
                                      <span className="text-gray-500 font-medium">No bonus</span>
                                      <span className="text-xs text-gray-400">Not allocated</span>
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
                            
                            <Link to={`/assign-evaluations?user=${member.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Assign Evaluation"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </Button>
                            </Link>
                            
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
          )}
        </div>
      </Card>
    </div>
  );
};

export default MyTeamPage;
