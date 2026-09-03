import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  type: string;
}

/**
 * Configure NetInfo reachability checking options
 */
NetInfo.configure({
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async (response) => response.status === 204,
  reachabilityLongTimeout: 30 * 1000, // 30s
  reachabilityShortTimeout: 5 * 1000,  // 5s
  reachabilityRequestTimeout: 10 * 1000,
});

/**
 * Normalizes NetInfo state to consistent NetworkStatus format
 */
export function formatNetworkState(state: NetInfoState): NetworkStatus {
  const isConnected = !!state.isConnected;
  const isInternetReachable = state.isInternetReachable;
  // If isConnected is false, we are definitely offline.
  // If isInternetReachable is explicitly false, we have network (e.g. WiFi with no internet) but no internet.
  const isOffline = !isConnected || isInternetReachable === false;

  return {
    isConnected,
    isInternetReachable,
    isOffline,
    type: state.type,
  };
}

/**
 * Fetches the current network state once
 */
export async function getNetworkState(): Promise<NetworkStatus> {
  try {
    const state = await NetInfo.fetch();
    return formatNetworkState(state);
  } catch (error) {
    console.warn('[NetworkService] Failed to fetch network state:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      isOffline: true,
      type: 'unknown',
    };
  }
}

/**
 * Subscribes to network state changes
 */
export function subscribeNetworkState(
  listener: (status: NetworkStatus) => void
): NetInfoSubscription {
  return NetInfo.addEventListener((state) => {
    listener(formatNetworkState(state));
  });
}

/**
 * Performs a fast manual active ping to verify internet reachability
 */
export async function verifyInternetAccess(timeoutMs = 4000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 204;
  } catch {
    // If google 204 fails, try Cloudflare 1.1.1.1 fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const fallbackRes = await fetch('https://cloudflare-dns.com/dns-query?name=google.com&type=A', {
        method: 'GET',
        headers: { accept: 'application/dns-json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return fallbackRes.ok;
    } catch {
      return false;
    }
  }
}
