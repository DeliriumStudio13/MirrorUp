import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import { fetchUsers, selectUsers } from '../../store/slices/userSlice';
import { fetchDepartments, selectDepartments } from '../../store/slices/departmentSlice';
import { fetchEvaluations } from '../../store/slices/evaluationSlice';
import { formatDate } from '../../utils/dateUtils';
import { db } from '../../firebase/config';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const BonusAllocationPage = () => {
  // Fixed all compilation issues
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const users = useSelector(selectUsers);
  const departments = useSelector(selectDepartments);
  
  // Local state for evaluations
  const [evaluations, setEvaluations] = useState([]);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [totalBudget, setTotalBudget] = useState('');
  const [kpiTarget, setKpiTarget] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [bonusAllocations, setBonusAllocations] = useState({});
  const [budgetExceeded, setBudgetExceeded] = useState(false);

  // Get user's department
  const userDepartment = departments.find(dept => dept.id === user?.employeeInfo?.department);
  const isHeadManager = user?.role === 'head-manager' || (user?.role === 'manager' && user?.isHeadManager === true);

  // Load existing bonus allocation from Firebase
  const loadExistingAllocation = useCallback(async () => {
    if (!user?.employeeInfo?.department) return;
    
    try {
      const allocationDoc = await getDoc(
        doc(db, 'bonusAllocations', `${user.employeeInfo.department}_${new Date().getFullYear()}`)
      );
      
      if (allocationDoc.exists()) {
        const data = allocationDoc.data();
        setTotalBudget(data.totalBudget || '');
        setKpiTarget(data.kpiTarget || '');
        setBonusAllocations(data.allocations || {});
        setLastSaved(data.lastSaved?.toDate() || null);
      }
    } catch (error) {
      console.error('❌ Error loading existing allocation:', error);
    }
  }, [user?.employeeInfo?.department]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch users, departments, and evaluations
        await Promise.all([
          dispatch(fetchUsers(user?.businessId)),
          dispatch(fetchDepartments(user?.businessId))
        ]);
        
        // Fetch evaluations with fallback to direct Firebase query
        try {
          const evaluationsResult = await dispatch(fetchEvaluations({ 
            businessId: user?.businessId, 
            pageSize: 100
            // No filters to avoid complex indexing requirements
          })).unwrap();
          
          // Set local evaluations state
          if (evaluationsResult) {
            setEvaluations(evaluationsResult.evaluations || []);
          }
        } catch (evalError) {
          console.error('❌ Error fetching evaluations via Redux:', evalError);
          
          try {
            // Direct Firebase query to bypass Redux indexing issues
            const evaluationsRef = collection(db, 'evaluations');
            const evaluationsQuery = query(
              evaluationsRef, 
              where('businessId', '==', user?.businessId)
            );
            const querySnapshot = await getDocs(evaluationsQuery);
            
            const directEvaluations = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            setEvaluations(directEvaluations);
          } catch (directError) {
            console.error('❌ Direct Firebase query also failed:', directError);
            setEvaluations([]);
          }
        }

        // Load existing bonus allocation if any
        await loadExistingAllocation();
      } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && isHeadManager) {
      loadData();
    }
  }, [dispatch, user, isHeadManager, loadExistingAllocation]);

  // Process team members with their latest evaluation scores
  useEffect(() => {
    if (!users.length || !userDepartment) return;

    const departmentMembers = users.filter(member => {
      // Don't include self
      if (member.id === user?.id) return false;
      
      // Check if member is in the same department
      if (member.employeeInfo?.department === userDepartment.id) {
        // Include employees, supervisors, and managers (but not other head managers)
        return ['employee', 'supervisor', 'manager'].includes(member.role);
      }
      
      return false;
    });

    const membersWithScores = departmentMembers.map(member => {
      // Find latest completed evaluation
      const memberEvaluations = evaluations.filter(
        evaluation => evaluation.evaluateeId === member.id && evaluation.status === 'completed'
      );

      const latestEvaluation = memberEvaluations.reduce((latest, current) => {
        if (!latest) return current; // First evaluation becomes the latest
        
        // Try different possible date field names
        const currentDate = current.completedAt?.toDate?.() || 
                           current.submittedAt?.toDate?.() || 
                           current.reviewedAt?.toDate?.() ||
                           new Date(current.completedAt || current.submittedAt || current.reviewedAt || 0);
                           
        const latestDate = latest.completedAt?.toDate?.() || 
                          latest.submittedAt?.toDate?.() || 
                          latest.reviewedAt?.toDate?.() ||
                          new Date(latest.completedAt || latest.submittedAt || latest.reviewedAt || 0);
        
        return currentDate > latestDate ? current : latest;
      }, null);

      const score = latestEvaluation?.managerReview?.overallRating || 0;
      const maxScore = latestEvaluation?.maxScore || 10;
      const normalizedScore = (score / maxScore) * 10; // Normalize to 10-point scale

      return {
        ...member,
        latestScore: score,
        maxScore,
        normalizedScore,
        latestEvaluation,
        monthlySalary: bonusAllocations[member.id]?.monthlySalary || '',
        bonusPercentage: bonusAllocations[member.id]?.bonusPercentage || 0
      };
    });

    setTeamMembers(membersWithScores);
  }, [users, userDepartment, user?.id, bonusAllocations, evaluations]);

  // Auto-calculate bonus allocations based on performance scores
  const calculateAutoAllocation = useCallback(() => {
    if (!totalBudget) {
      alert('Please enter a total budget first.');
      return;
    }
    
    if (!teamMembers.length) {
      alert('No team members found.');
      return;
    }

    const budget = parseFloat(totalBudget);
    
    // Check if any team members have monthly salaries entered
    const membersWithSalaries = teamMembers.filter(member => member.monthlySalary && parseFloat(member.monthlySalary) > 0);
    
    if (membersWithSalaries.length === 0) {
      alert('Please enter monthly salaries for your team members first.');
      return;
    }

    const totalPerformanceWeight = membersWithSalaries.reduce((sum, member) => 
      sum + (member.normalizedScore || 1), 0  // Use 1 as default if no score
    );

    if (totalPerformanceWeight === 0) {
      alert('No performance scores available for allocation.');
      return;
    }

    const newAllocations = { ...bonusAllocations };

    membersWithSalaries.forEach(member => {
      const salary = parseFloat(member.monthlySalary);
      const performanceWeight = member.normalizedScore || 1; // Use 1 as default
      const budgetShare = (performanceWeight / totalPerformanceWeight) * budget;
      const bonusPercentage = Math.round((budgetShare / salary) * 100 * 10) / 10; // Round to 1 decimal

      newAllocations[member.id] = {
        ...newAllocations[member.id],
        monthlySalary: member.monthlySalary,
        bonusPercentage: Math.max(0, bonusPercentage)
      };
    });

    setBonusAllocations(newAllocations);
    // Auto-allocation completed successfully
  }, [totalBudget, teamMembers, bonusAllocations]);

  // Handle salary input change
  const handleSalaryChange = (memberId, salary) => {
    setBonusAllocations(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        monthlySalary: salary,
        bonusPercentage: prev[memberId]?.bonusPercentage || 0
      }
    }));
  };

  // Handle percentage adjustment
  const adjustPercentage = (memberId, increment) => {
    setBonusAllocations(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        bonusPercentage: Math.max(0, (prev[memberId]?.bonusPercentage || 0) + increment)
      }
    }));
  };

  // Calculate total allocation and check budget
  useEffect(() => {
    const totalAllocation = teamMembers.reduce((sum, member) => {
      const allocation = bonusAllocations[member.id];
      if (!allocation?.monthlySalary || !allocation?.bonusPercentage) return sum;
      
      const salary = parseFloat(allocation.monthlySalary);
      const percentage = parseFloat(allocation.bonusPercentage);
      const bonusAmount = (salary * percentage) / 100;
      
      return sum + bonusAmount;
    }, 0);

    const budget = parseFloat(totalBudget) || 0;
    setBudgetExceeded(totalAllocation > budget);
  }, [teamMembers, bonusAllocations, totalBudget]);

  // Save progress
  const handleSaveProgress = async () => {
    setSaving(true);
    try {
      const allocationData = {
        departmentId: user?.employeeInfo?.department,
        year: new Date().getFullYear(),
        totalBudget: parseFloat(totalBudget) || 0,
        kpiTarget: kpiTarget || '',
        allocations: bonusAllocations,
        lastSaved: new Date(),
        createdBy: user?.uid || user?.id,
        status: 'draft'
      };

      await setDoc(
        doc(db, 'bonusAllocations', `${user?.employeeInfo?.department}_${new Date().getFullYear()}`),
        allocationData
      );

      setLastSaved(new Date());
      // Bonus allocation saved successfully
    } catch (error) {
      console.error('❌ Error saving bonus allocation:', error);
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const getTotalAllocation = () => {
    return teamMembers.reduce((sum, member) => {
      const allocation = bonusAllocations[member.id];
      if (!allocation?.monthlySalary || !allocation?.bonusPercentage) return sum;
      
      const salary = parseFloat(allocation.monthlySalary);
      const percentage = parseFloat(allocation.bonusPercentage);
      const bonusAmount = (salary * percentage) / 100;
      
      return sum + bonusAmount;
    }, 0);
  };

  const getBonusAmount = (member) => {
    const allocation = bonusAllocations[member.id];
    if (!allocation?.monthlySalary || !allocation?.bonusPercentage) return 0;
    
    const salary = parseFloat(allocation.monthlySalary);
    const percentage = parseFloat(allocation.bonusPercentage);
    return (salary * percentage) / 100;
  };

  if (!isHeadManager) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">
            Only department head managers can access the bonus allocation page.
          </p>
          <Link to="/dashboard" className="mt-4 inline-block">
            <Button>Return to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bonus Allocation</h1>
        <p className="text-gray-600">
          Allocate bonuses for {userDepartment?.name} department based on performance
        </p>
      </div>

      {/* Budget and KPI Settings */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Department Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Bonus Budget ($)
              </label>
              <div className="relative">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter total budget"
                />
              </div>
            </div>

            {/* KPI Target */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department KPI Target
              </label>
              <input
                type="text"
                value={kpiTarget}
                onChange={(e) => setKpiTarget(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter KPI target"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Feature coming soon</p>
            </div>

            {/* Auto Calculate Button */}
            <div className="flex items-end">
              <Button
                onClick={calculateAutoAllocation}
                disabled={!totalBudget}
                className="w-full"
              >
                Auto-Allocate Based on Performance
              </Button>
            </div>
          </div>

          {/* Budget Status */}
          {totalBudget && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">Total Budget: </span>
                  <span className="font-medium">${parseFloat(totalBudget).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Allocated: </span>
                  <span className={`font-medium ${budgetExceeded ? 'text-red-600' : 'text-green-600'}`}>
                    ${getTotalAllocation().toLocaleString()}
                  </span>
                </div>
                <div>
                  {budgetExceeded ? (
                    <div className="flex items-center text-red-600">
                      <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
                      <span className="text-sm font-medium">Budget Exceeded</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-green-600">
                      <CheckCircleIcon className="h-5 w-5 mr-1" />
                      <span className="text-sm font-medium">Within Budget</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Team Members Table */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Team Bonus Allocation</h2>
            <div className="flex items-center space-x-4">
              {lastSaved && (
                <div className="flex items-center text-sm text-gray-500">
                  <BookmarkIcon className="h-4 w-4 mr-1" />
                  <span>Last saved: {formatDate(lastSaved)}</span>
                </div>
              )}
              <Button
                onClick={handleSaveProgress}
                disabled={saving}
                variant="outline"
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </Button>
            </div>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No team members found in your department.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latest Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monthly Salary ($)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bonus %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bonus Amount ($)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      {/* Employee */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                                                      <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {member.profile?.firstName?.[0]}{member.profile?.lastName?.[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.profile?.firstName} {member.profile?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {member.role?.charAt(0).toUpperCase() + member.role?.slice(1)}
                        </Badge>
                      </td>

                      {/* Latest Score */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.latestScore ? (
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{member.latestScore}</span>
                            <span className="text-gray-500">/{member.maxScore}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No evaluation</span>
                        )}
                      </td>

                      {/* Monthly Salary */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={bonusAllocations[member.id]?.monthlySalary || ''}
                          onChange={(e) => handleSalaryChange(member.id, e.target.value)}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </td>

                      {/* Bonus Percentage */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => adjustPercentage(member.id, -0.5)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <ArrowDownIcon className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-medium min-w-[3rem] text-center">
                            {(bonusAllocations[member.id]?.bonusPercentage || 0).toFixed(1)}%
                          </span>
                          <button
                            onClick={() => adjustPercentage(member.id, 0.5)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                      {/* Bonus Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {getBonusAmount(member).toLocaleString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {member.latestEvaluation && (
                            <Link
                              to={`/evaluation-review/${member.latestEvaluation.id}`}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              View Review
                            </Link>
                          )}
                        </div>
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

export default BonusAllocationPage;
