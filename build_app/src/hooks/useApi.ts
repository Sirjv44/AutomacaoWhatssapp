import { useState, useEffect, useCallback } from 'react';
import { apiService, AutomationStatus, ExtractionStatus } from '../services/api';

export const useApiHealth = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      setIsChecking(true);
      await apiService.healthCheck();
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
      console.error('API health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isConnected, isChecking, checkHealth };
};

export const useAutomationStatus = () => {
  const [status, setStatus] = useState<AutomationStatus>({
    isRunning: false,
    isPaused: false,
    currentStep: '',
    progress: 0,
    totalContacts: 0,
    processedContacts: 0,
    currentGroup: '',
    currentGroupIndex: 0,
    totalGroups: 0,
    logs: [],
    estimatedTimeRemaining: '',
    canResume: false,
    sessionPersisted: false,
    connectionStatus: 'disconnected',
    currentSessionId: '',
    groupsInCurrentSession: 0,
  });

  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const newStatus = await apiService.getAutomationStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to fetch automation status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    
    // Poll status every 2 seconds when automation is running
    const interval = setInterval(() => {
      if (status.isRunning) {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus, status.isRunning]);

  return { status, isLoading, fetchStatus };
};


export const useExtractionStatus = () => {
  const [status, setStatus] = useState<ExtractionStatus>({
    isRunning: false,
    currentStep: '',
    progress: 0,
    totalGroups: 0,
    processedGroups: 0,
    currentGroup: '',
    logs: [],
    estimatedTimeRemaining: '',
    extractedContacts: [],
    uniqueContacts: 0,
    duplicatesFound: 0,
  });

  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const newStatus = await apiService.getExtractionStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to fetch extraction status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    
    // Poll status every 2 seconds when extraction is running
    const interval = setInterval(() => {
      if (status.isRunning) {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus, status.isRunning]);

  return { status, isLoading, fetchStatus };
};