import { useState, useEffect, useCallback } from 'react';
import {
  NetworkStatus,
  getNetworkState,
  subscribeNetworkState,
  verifyInternetAccess,
} from '../services/network';

export interface UseNetworkStatusReturn extends NetworkStatus {
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    isOffline: false,
    type: 'unknown',
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const updateStatus = useCallback((newStatus: NetworkStatus) => {
    setStatus(newStatus);
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const current = await getNetworkState();
      let hasInternet = !current.isOffline;

      // Active verification if connected or ambiguous
      if (current.isConnected) {
        const pingOk = await verifyInternetAccess(3500);
        hasInternet = pingOk;
        updateStatus({
          ...current,
          isInternetReachable: pingOk,
          isOffline: !pingOk,
        });
      } else {
        updateStatus(current);
      }

      return hasInternet;
    } catch {
      updateStatus({
        isConnected: false,
        isInternetReachable: false,
        isOffline: true,
        type: 'unknown',
      });
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [updateStatus]);

  useEffect(() => {
    // Initial status fetch
    getNetworkState().then((initial) => {
      setStatus(initial);
    });

    // Real-time listener
    const unsubscribe = subscribeNetworkState((newStatus) => {
      updateStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, [updateStatus]);

  return {
    ...status,
    isChecking,
    checkConnection,
  };
}
