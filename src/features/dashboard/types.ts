import { AuthSession } from '../../core/types';

export interface WebScreenProps {
  initialUrl?: string;
  userData?: AuthSession | null;
  onLogout?: () => void;
  onNavigateToSilo?: () => void;
}
