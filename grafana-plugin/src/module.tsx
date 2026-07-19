import { AppPlugin } from '@grafana/data';
import { BatteryOperationsPage } from './pages/BatteryOperationsPage';

export const plugin = new AppPlugin<{}>().setRootPage(BatteryOperationsPage);
