import { useState, useCallback, useRef } from 'react';
import { ActivityItem } from '../components/ActivityFeed';

export const useActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const activityIdCounter = useRef(1);

  const generateId = () => {
    return `activity-${Date.now()}-${activityIdCounter.current++}`;
  };

  const addActivity = useCallback((activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: generateId(),
      timestamp: new Date(),
    };

    setActivities(prev => [newActivity, ...prev.slice(0, 49)]); // Keep last 50 activities
  }, []);

  const addProcessingActivity = useCallback((
    title: string, 
    message: string, 
    metadata?: Record<string, any>
  ) => {
    const activityId = generateId();
    const newActivity: ActivityItem = {
      id: activityId,
      type: 'processing',
      title,
      message,
      timestamp: new Date(),
      progress: 0,
      metadata,
    };

    setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
    return activityId;
  }, []);

  const updateProcessingProgress = useCallback((activityId: string, progress: number) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, progress: Math.min(100, Math.max(0, progress)) }
          : activity
      )
    );
  }, []);

  const completeProcessingActivity = useCallback((
    activityId: string, 
    type: 'success' | 'error' | 'warning' = 'success',
    message?: string,
    duration?: number,
    metadata?: Record<string, any>
  ) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { 
              ...activity, 
              type, 
              message: message || activity.message,
              progress: 100,
              duration,
              metadata: { ...activity.metadata, ...metadata }
            }
          : activity
      )
    );
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const removeActivity = useCallback((activityId: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== activityId));
  }, []);

  const showActivityFeed = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideActivityFeed = useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggleActivityFeed = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Utility functions for common activity types
  const addSuccessActivity = useCallback((
    title: string, 
    message: string, 
    metadata?: Record<string, any>
  ) => {
    addActivity({ type: 'success', title, message, metadata });
  }, [addActivity]);

  const addErrorActivity = useCallback((
    title: string, 
    message: string, 
    metadata?: Record<string, any>
  ) => {
    addActivity({ type: 'error', title, message, metadata });
  }, [addActivity]);

  const addInfoActivity = useCallback((
    title: string, 
    message: string, 
    metadata?: Record<string, any>
  ) => {
    addActivity({ type: 'info', title, message, metadata });
  }, [addActivity]);

  const addWarningActivity = useCallback((
    title: string, 
    message: string, 
    metadata?: Record<string, any>
  ) => {
    addActivity({ type: 'warning', title, message, metadata });
  }, [addActivity]);

  return {
    activities,
    isVisible,
    addActivity,
    addProcessingActivity,
    updateProcessingProgress,
    completeProcessingActivity,
    addSuccessActivity,
    addErrorActivity,
    addInfoActivity,
    addWarningActivity,
    clearActivities,
    removeActivity,
    showActivityFeed,
    hideActivityFeed,
    toggleActivityFeed,
  };
}; 