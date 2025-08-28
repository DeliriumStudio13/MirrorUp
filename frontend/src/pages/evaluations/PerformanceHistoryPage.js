import React from 'react';

// Components
import Card from '../../components/common/Card';

// Icons
import { ChartBarIcon } from '@heroicons/react/24/outline';

const PerformanceHistoryPage = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Performance History</h1>
        <p className="text-gray-600">View your historical performance data and trends</p>
      </div>

      <Card className="text-center py-12">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No performance history</h3>
        <p className="text-gray-500">
          Your performance history will appear here once you complete evaluations.
        </p>
      </Card>
    </div>
  );
};

export default PerformanceHistoryPage;