/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { registerBackgroundMessageHandler } from './src/shared/services/notifications';

// Register background headless handler for FCM
registerBackgroundMessageHandler();

AppRegistry.registerComponent(appName, () => App);
