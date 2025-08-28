import React from 'react';

// Components
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// Icons
import { FlagIcon } from '@heroicons/react/24/outline';

const MyGoalsPage = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Goals</h1>
        <p className="text-gray-600">Track your performance goals and targets</p>
      </div>

      <Card className="text-center py-12">
        <FlagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No goals set</h3>
        <p className="text-gray-500 mb-6">
          Your performance goals will appear here once they are set during evaluations.
        </p>
        <Button variant="outline">
          View Evaluations
        </Button>
      </Card>
    </div>
  );
};

export default MyGoalsPage;