import { AuthSession } from '../types/global';

export type RootScreen = 'login' | 'web' | 'silo' | 'signup' | 'icon-config';

export interface NavigationProps {
  currentScreen: RootScreen;
  navigate: (screen: RootScreen, data?: unknown) => void;
  authData?: AuthSession | null;
}
