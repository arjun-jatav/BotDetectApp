import { AuthSession, LoginResponse } from '../../core/types';

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export type { AuthSession, LoginResponse };

export interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
