import React from 'react';

export interface ActivityItem {
  id: string;
  type: 'processing' | 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  progress?: number; // For processing items (0-100)
  duration?: number; // Duration in milliseconds
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isVisible: boolean;
  onClose: () => void;
  onClearAll: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  activities, 
  isVisible, 
  onClose, 
  onClearAll 
}) => {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'processing':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        );
      case 'success':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'processing':
        return 'border-l-blue-500 bg-blue-50/50';
      case 'success':
        return 'border-l-green-500 bg-green-50/50';
      case 'error':
        return 'border-l-red-500 bg-red-50/50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/50';
      case 'info':
        return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
            <p className="text-sm text-gray-500">{activities.length} activities</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {activities.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h4>
            <p className="text-gray-500">
              Your recent activities will appear here as you process invoices.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 rounded-xl border-l-4 ${getActivityColor(activity.type)} transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start space-x-3">
                  {getActivityIcon(activity.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {activity.title}
                      </h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.message}
                    </p>
                    
                    {/* Progress bar for processing items */}
                    {activity.type === 'processing' && activity.progress !== undefined && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{activity.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${activity.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Duration for completed items */}
                    {activity.duration && (
                      <div className="text-xs text-gray-500">
                        Duration: {formatDuration(activity.duration)}
                      </div>
                    )}
                    
                    {/* Metadata for additional info */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <div key={key} className="text-xs text-gray-500">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed; 