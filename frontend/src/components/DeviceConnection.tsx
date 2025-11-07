import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { DEVICE_TYPE_OPTIONS } from '../types/devices.ts';
import type { DeviceTypeOptionValue } from '../types/devices.ts';

const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const CardTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.2rem;
  font-weight: 600;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  ${({ variant = 'primary' }) => {
    switch (variant) {
      case 'primary':
        return `
          background-color: #3498db;
          color: white;
          &:hover {
            background-color: #2980b9;
          }
        `;
      case 'secondary':
        return `
          background-color: #95a5a6;
          color: white;
          &:hover {
            background-color: #7f8c8d;
          }
        `;
      case 'danger':
        return `
          background-color: #e74c3c;
          color: white;
          &:hover {
            background-color: #c0392b;
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface DeviceConnectionProps {
  onConnect: (deviceType: string, port?: string) => Promise<{ deviceId: string; device: { model: string; serialNumber: string; deviceType: string } }>;
  availablePorts: string[];
  onRefreshPorts: () => Promise<void>;
  isBusy: boolean;
}

export const DeviceConnection: React.FC<DeviceConnectionProps> = ({
  onConnect,
  availablePorts,
  onRefreshPorts,
  isBusy,
}) => {
  const [deviceType, setDeviceType] = useState<DeviceTypeOptionValue>('Mock');
  const [selectedPort, setSelectedPort] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    onRefreshPorts();
  }, [onRefreshPorts]);

  useEffect(() => {
    if (deviceType !== 'Mock') {
      onRefreshPorts();
    }
  }, [deviceType, onRefreshPorts]);

  useEffect(() => {
    if (deviceType !== 'Mock' && availablePorts.length > 0 && !selectedPort) {
      setSelectedPort(availablePorts[0] ?? '');
    }
  }, [availablePorts, deviceType, selectedPort]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const port = deviceType === 'Mock' ? undefined : selectedPort;
      const result = await onConnect(deviceType, port);
      alert(`Connected ${result.device.deviceType} (${result.device.model}) as ${result.deviceId}`);
    } catch (error) {
      console.error('Failed to connect:', error);
      alert(`Failed to connect: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardTitle>Device Management</CardTitle>

      <FormGroup>
        <Label htmlFor="device-type">Device Type</Label>
        <Select
          id="device-type"
          value={deviceType}
          onChange={(event) => setDeviceType(event.target.value as DeviceTypeOptionValue)}
          disabled={isConnecting || isBusy}
        >
          {DEVICE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormGroup>

      {deviceType !== 'Mock' && (
        <FormGroup>
          <Label htmlFor="serial-port">Serial Port</Label>
          <Select
            id="serial-port"
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            disabled={isConnecting || isBusy || availablePorts.length === 0}
          >
            {availablePorts.map((port) => (
              <option key={port} value={port}>
                {port}
              </option>
            ))}
          </Select>
        </FormGroup>
      )}

      <ButtonGroup>
        <Button
          variant="primary"
          onClick={handleConnect}
          disabled={isConnecting || isBusy || (deviceType !== 'Mock' && !selectedPort)}
        >
          {isConnecting ? 'Connecting...' : 'Connect New Device'}
        </Button>

        <Button
          variant="secondary"
          onClick={onRefreshPorts}
          disabled={isConnecting || isBusy}
        >
          Refresh Ports
        </Button>
      </ButtonGroup>

      {deviceType !== 'Mock' && availablePorts.length === 0 && (
        <p style={{ color: '#666', marginTop: '0.75rem' }}>
          No serial ports detected. Ensure your device is connected and click &quot;Refresh Ports&quot;.
        </p>
      )}
    </Card>
  );
};