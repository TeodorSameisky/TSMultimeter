import { contextBridge, ipcRenderer } from 'electron';
import type { PopoutDescriptor } from './src/types/popout';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Device management
  connectDevice: (deviceType: string, port?: string) =>
    ipcRenderer.invoke('connect_device', deviceType, port),

  disconnectDevice: () => ipcRenderer.invoke('disconnect_device'),

  getDeviceStatus: () => ipcRenderer.invoke('get_device_status'),

  resetDevice: () => ipcRenderer.invoke('reset_device'),

  // Raw commands
  sendRawCommand: (command: string) => ipcRenderer.invoke('send_raw_command', command),

  // System
  getAvailablePorts: () => ipcRenderer.invoke('get_available_ports'),

  // Popout windows
  syncPopouts: (descriptors: PopoutDescriptor[]) => ipcRenderer.invoke('sync-popouts', descriptors),

  // Event listeners
  onMeasurementUpdate: (callback: (measurement: any) => void) => {
    ipcRenderer.on('measurement-update', (_event, measurement) => callback(measurement));
  },

  removeAllListeners: (event: string) => {
    ipcRenderer.removeAllListeners(event);
  },
});