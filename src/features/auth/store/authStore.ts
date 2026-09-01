import { AuthSession } from '../../../core/types';

export class AuthStore {
  private static instance: AuthStore;
  private currentSession: AuthSession | null = null;

  static getInstance(): AuthStore {
    if (!AuthStore.instance) {
      AuthStore.instance = new AuthStore();
    }
    return AuthStore.instance;
  }

  setSession(session: AuthSession | null): void {
    this.currentSession = session;
  }

  getSession(): AuthSession | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return !!this.currentSession?.token;
  }
}

export const authStore = AuthStore.getInstance();
