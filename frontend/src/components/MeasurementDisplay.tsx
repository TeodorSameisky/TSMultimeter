import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import type { MeasurementResponse } from '../types/deviceData.ts';

const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex: 1;
`;

const CardTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.2rem;
  font-weight: 600;
`;

const MeasurementValue = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: #2c3e50;
  text-align: center;
  margin: 1rem 0;
  font-family: 'Courier New', monospace;
`;

const MeasurementUnit = styled.div`
  font-size: 1.5rem;
  color: #7f8c8d;
  text-align: center;
  margin-bottom: 1rem;
`;

const MeasurementDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
`;

const DetailItem = styled.div`
  text-align: center;
`;

const DetailLabel = styled.div`
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
`;

const DetailValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin: 0.25rem;

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
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
`;

interface MeasurementDisplayProps {
  deviceId: string;
  deviceType?: string;
  isConnected: boolean;
  getMeasurement: (deviceId: string) => Promise<MeasurementResponse>;
}

export const MeasurementDisplay: React.FC<MeasurementDisplayProps> = ({
  deviceId,
  isConnected,
  getMeasurement,
}) => {
  const [currentMeasurement, setCurrentMeasurement] = useState<MeasurementResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingHandle = useRef<ReturnType<typeof setInterval> | null>(null);

  const getMeasurementData = async () => {
    try {
      const result = await getMeasurement(deviceId);
      setCurrentMeasurement(result);
      setError(null);
    } catch (err) {
      setError(`Failed to get measurement: ${err}`);
      console.error('Measurement error:', err);
    }
  };

  const startPolling = () => {
    if (isPolling || !isConnected) {
      return;
    }
    setIsPolling(true);
    pollingHandle.current = setInterval(getMeasurementData, 1000); // Poll every second
  };

  const stopPolling = () => {
    setIsPolling(false);
    if (pollingHandle.current) {
      clearInterval(pollingHandle.current);
      pollingHandle.current = null;
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (!isConnected && isPolling) {
      stopPolling();
    }
  }, [isConnected, isPolling]);

  const formatValue = (value: number) => {
    // Format with appropriate precision
    if (Math.abs(value) >= 1000) {
      return value.toFixed(1);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(3);
    } else {
      return value.toExponential(3);
    }
  };

  const getUnitDisplay = (unit: string) => {
    const unitMap: { [key: string]: string } = {
      'VDC': 'V DC',
      'VAC': 'V AC',
      'ADC': 'A DC',
      'AAC': 'A AC',
      'OHM': 'Ω',
      'Hz': 'Hz',
      'F': 'F',
      'CEL': '°C',
      'FAR': '°F',
    };
    return unitMap[unit] || unit;
  };

  const getStateColor = (state?: string) => {
    switch (state) {
      case 'NORMAL':
        return '#28a745';
      case 'OL':
      case 'OL_MINUS':
        return '#dc3545';
      case 'INVALID':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  return (
    <Card>
      <CardTitle>Measurement Display</CardTitle>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '0.5rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <MeasurementValue
        style={{
          color: currentMeasurement ? getStateColor(currentMeasurement.state) : '#6c757d'
        }}
      >
        {currentMeasurement ? formatValue(currentMeasurement.value) : '---'}
      </MeasurementValue>

      <MeasurementUnit>
        {currentMeasurement ? getUnitDisplay(currentMeasurement.unit) : 'No Unit'}
      </MeasurementUnit>

      <ButtonGroup>
        <Button onClick={getMeasurementData} disabled={isPolling || !isConnected}>
          Single Measurement
        </Button>
        {!isPolling ? (
          <Button variant="primary" onClick={startPolling} disabled={!isConnected}>
            Start Continuous
          </Button>
        ) : (
          <Button variant="secondary" onClick={stopPolling}>
            Stop Continuous
          </Button>
        )}
      </ButtonGroup>

      {!isConnected && (
        <p style={{ color: '#666', textAlign: 'center', marginTop: '0.75rem' }}>
          Device disconnected. Reconnect to resume measurements.
        </p>
      )}

      {currentMeasurement && (
        <MeasurementDetails>
          <DetailItem>
            <DetailLabel>State</DetailLabel>
            <DetailValue style={{ color: getStateColor(currentMeasurement.state) }}>
              {currentMeasurement.state}
            </DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>Attribute</DetailLabel>
            <DetailValue>
              {currentMeasurement.attribute || 'None'}
            </DetailValue>
          </DetailItem>

          {currentMeasurement.timestamp && (
            <DetailItem>
              <DetailLabel>Timestamp</DetailLabel>
              <DetailValue style={{ fontSize: '0.9rem' }}>
                {new Date(currentMeasurement.timestamp).toLocaleTimeString()}
              </DetailValue>
            </DetailItem>
          )}

          <DetailItem>
            <DetailLabel>Status</DetailLabel>
            <DetailValue style={{ color: isPolling ? '#28a745' : '#6c757d' }}>
              {isPolling ? 'Continuous' : 'Manual'}
            </DetailValue>
          </DetailItem>
        </MeasurementDetails>
      )}
    </Card>
  );
};