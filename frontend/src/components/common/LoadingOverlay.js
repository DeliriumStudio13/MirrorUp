import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = ({ message }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
      <div className="text-center">
        <LoadingSpinner size="large" />
        <div className="mt-4 text-gray-600 dark:text-gray-400">
          <p className="text-lg font-semibold">Loading MirrorUp</p>
          {message && (
            <p className="mt-2 text-sm">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
