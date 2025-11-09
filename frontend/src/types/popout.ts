export type PopoutChannelType = 'device' | 'math';

export type PopoutInputDescriptor = {
  channelId: string;
  variable: string;
};

export type PopoutDescriptor = {
  channelId: string;
  channelName: string;
  channelType: PopoutChannelType;
  color: string;
  precision?: number;
  unit?: string;
  deviceId?: string;
  expression?: string;
  inputs?: PopoutInputDescriptor[];
};
