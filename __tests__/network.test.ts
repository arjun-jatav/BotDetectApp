import { formatNetworkState, getNetworkState } from '../src/shared/services/network';
import NetInfo from '@react-native-community/netinfo';

describe('Network Service', () => {
  it('correctly formats online network state', () => {
    const state = formatNetworkState({
      type: 'wifi' as any,
      isConnected: true,
      isInternetReachable: true,
      details: null as any,
    });

    expect(state.isConnected).toBe(true);
    expect(state.isOffline).toBe(false);
    expect(state.type).toBe('wifi');
  });

  it('correctly formats offline network state when isConnected is false', () => {
    const state = formatNetworkState({
      type: 'none' as any,
      isConnected: false,
      isInternetReachable: false,
      details: null as any,
    });

    expect(state.isConnected).toBe(false);
    expect(state.isOffline).toBe(true);
  });

  it('correctly formats offline state when isInternetReachable is false', () => {
    const state = formatNetworkState({
      type: 'wifi' as any,
      isConnected: true,
      isInternetReachable: false,
      details: null as any,
    });

    expect(state.isConnected).toBe(true);
    expect(state.isOffline).toBe(true);
  });

  it('fetches current network state via NetInfo', async () => {
    const state = await getNetworkState();
    expect(NetInfo.fetch).toHaveBeenCalled();
    expect(state.isConnected).toBe(true);
  });
});
