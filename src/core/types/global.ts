export interface UserProfile {
  id?: string | number;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  token?: string;
  admin_token?: string;
  accessToken?: string;
  jwt?: string;
  identifier?: string;
  email?: string;
  username?: string;
  password?: string;
  role?: string;
  user?: UserProfile;
  fcmToken?: string;
  [key: string]: unknown;
}

export interface LoginResponse extends AuthSession {
  success?: boolean;
  message?: string;
}

export interface NotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export type AppScreen = 'login' | 'web' | 'silo' | 'signup' | 'icon-config';

export interface OTAManifest {
  version: string;
  bundleUrl: string;
  hash?: string;
  mandatory?: boolean;
  changelog?: string;
  minNativeVersion?: string;
  releasedAt?: string;
}

export type OTAStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'error';

export interface OTAUpdateState {
  status: OTAStatus;
  currentVersion: string;
  latestVersion: string | null;
  progress: number;
  changelog?: string;
  isMandatory?: boolean;
  error?: string;
}
