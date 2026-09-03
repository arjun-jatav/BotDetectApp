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
  FcmToken?: string;
  [key: string]: unknown;
}

export interface LoginResponse extends AuthSession {
  success?: boolean;
  message?: string;
}

export type SirenNotificationType =
  | 'first_message'
  | 'visitor_message'
  | 'lead_captured'
  | 'meeting_booked'
  | 'attachment'
  | 'visitor_landed'
  | 'human_support'
  | 'llm_credit_exhausted'
  | 'conversation_taken_over'
  | 'test_push';

export interface NotificationData {
  type?: SirenNotificationType | string;
  sessionId?: string;
  url?: string;
  [key: string]: unknown;
}

export interface NotificationPayload {
  title?: string;
  body?: string;
  data?: NotificationData;
}

export type AppScreen = 'login' | 'web' | 'silo' | 'signup' | 'icon-config';

export interface OTAPlatformConfig {
  bundleUrl: string;
  bundleFile?: string;
}

export interface OTAManifest {
  version: string;
  bundleUrl?: string;
  hash?: string;
  mandatory?: boolean;
  changelog?: string;
  minNativeVersion?: string;
  releasedAt?: string;
  android?: OTAPlatformConfig;
  ios?: OTAPlatformConfig;
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
