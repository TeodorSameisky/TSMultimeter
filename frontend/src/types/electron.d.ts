import type { PopoutDescriptor } from './popout';

declare global {
  interface Window {
    electronAPI?: {
      connectDevice?: (deviceType: string, port?: string) => Promise<unknown>;
      disconnectDevice?: () => Promise<unknown>;
      getDeviceStatus?: () => Promise<unknown>;
      resetDevice?: () => Promise<unknown>;
      sendRawCommand?: (command: string) => Promise<unknown>;
      getAvailablePorts?: () => Promise<string[]>;
      onMeasurementUpdate?: (callback: (measurement: unknown) => void) => void;
      removeAllListeners?: (event: string) => void;
      syncPopouts?: (descriptors: PopoutDescriptor[]) => Promise<void>;
    };
  }
}

export {};
