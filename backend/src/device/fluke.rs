//! Fluke 289/287 device implementation
//!
//! Implements the serial communication protocol for Fluke 289 and 287 multimeters.

use crate::device::{
    Device, DeviceInfo, DeviceType, Measurement, MeasurementAttribute, MeasurementState, Unit,
};
use crate::error::{Error, Result};
use async_trait::async_trait;
use serialport::{DataBits, FlowControl, Parity, SerialPort, StopBits};
use std::io::{Read, Write};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;

/// Fluke device implementation
pub struct FlukeDevice {
    device_type: DeviceType,
    port_name: Option<String>,
    port: Arc<Mutex<Option<Box<dyn SerialPort>>>>,
}

impl FlukeDevice {
    /// Create a new Fluke device instance
    pub fn new(device_type: DeviceType, port_name: Option<String>) -> Self {
        Self {
            device_type,
            port_name,
            port: Arc::new(Mutex::new(None)),
        }
    }

    /// Send a command and get the response
    async fn send_command_internal(&mut self, command: &str) -> Result<String> {
        let mut port_guard = self.port.lock().await;
        let port = port_guard
            .as_mut()
            .ok_or_else(|| Error::Connection("Not connected".to_string()))?;

        // Send command with CR
        let command_with_cr = format!("{}\r", command);
        port.write_all(command_with_cr.as_bytes())?;

        // Small delay for device to process
        tokio::time::sleep(Duration::from_millis(50)).await;

        // Read response
        let mut buffer = [0u8; 1024];
        let mut response = String::new();
        let mut timeout_count = 0;

        loop {
            match port.read(&mut buffer) {
                Ok(bytes_read) => {
                    let chunk = String::from_utf8_lossy(&buffer[..bytes_read]);
                    response.push_str(&chunk);

                    // Check if we have a complete response (ends with CR)
                    if response.contains('\r') {
                        break;
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    timeout_count += 1;
                    if timeout_count > 10 {
                        return Err(Error::Timeout);
                    }
                }
                Err(e) => return Err(e.into()),
            }

            tokio::time::sleep(Duration::from_millis(10)).await;
        }

        Ok(response.trim_end_matches('\r').to_string())
    }

    /// Parse command acknowledgment
    fn parse_ack(response: &str) -> Result<()> {
        if response.is_empty() {
            return Err(Error::Parse("Empty response".to_string()));
        }

        match response.chars().next().unwrap() {
            '0' => Ok(()), // OK
            '1' => Err(Error::InvalidCommand("Syntax error".to_string())),
            '2' => Err(Error::Device("Execution error".to_string())),
            '5' => Err(Error::Device("No data available".to_string())),
            _ => Err(Error::Parse(format!(
                "Unknown ACK code: {}",
                response.chars().next().unwrap()
            ))),
        }
    }

    /// Parse measurement from QM command response
    fn parse_measurement(response: &str) -> Result<Measurement> {
        // Response format: ACK<CR> VALUE,UNIT,STATE,ATTRIBUTE<CR>
        let parts: Vec<&str> = response.split(',').collect();
        if parts.len() < 4 {
            return Err(Error::Parse(
                "Invalid measurement response format".to_string(),
            ));
        }

        let value = parts[0]
            .trim()
            .parse::<f64>()
            .map_err(|_| Error::Parse(format!("Invalid measurement value: {}", parts[0])))?;

        let unit = Self::parse_unit(parts[1].trim())?;
        let state = Self::parse_state(parts[2].trim())?;
        let attribute = Self::parse_attribute(parts[3].trim())?;

        Ok(Measurement {
            value,
            unit,
            state,
            attribute,
            timestamp: Some(chrono::Utc::now()),
        })
    }

    /// Parse unit string
    fn parse_unit(unit_str: &str) -> Result<Unit> {
        match unit_str {
            "NONE" => Ok(Unit::None),
            "VDC" => Ok(Unit::VoltDc),
            "VAC" => Ok(Unit::VoltAc),
            "ADC" => Ok(Unit::AmpDc),
            "AAC" => Ok(Unit::AmpAc),
            "VAC_PLUS_DC" => Ok(Unit::VoltAcPlusDc),
            "AAC_PLUS_DC" => Ok(Unit::AmpAcPlusDc),
            "V" => Ok(Unit::Volt),
            "A" => Ok(Unit::Amp),
            "OHM" => Ok(Unit::Ohm),
            "S" => Ok(Unit::Siemens),
            "Hz" => Ok(Unit::Hertz),
            "SEC" => Ok(Unit::Second),
            "F" => Ok(Unit::Farad),
            "CEL" => Ok(Unit::Celsius),
            "FAR" => Ok(Unit::Fahrenheit),
            "PCT" => Ok(Unit::Percent),
            "dBm" => Ok(Unit::DecibelM),
            "dBV" => Ok(Unit::DecibelV),
            "dB" => Ok(Unit::Decibel),
            "CREST_FACTOR" => Ok(Unit::CrestFactor),
            _ => Err(Error::Parse(format!("Unknown unit: {}", unit_str))),
        }
    }

    /// Parse state string
    fn parse_state(state_str: &str) -> Result<MeasurementState> {
        match state_str {
            "NORMAL" => Ok(MeasurementState::Normal),
            "INVALID" => Ok(MeasurementState::Invalid),
            "BLANK" => Ok(MeasurementState::Blank),
            "OL" => Ok(MeasurementState::Overload),
            "OL_MINUS" => Ok(MeasurementState::OverloadNegative),
            "OPEN_TC" => Ok(MeasurementState::OpenThermocouple),
            "DISCHARGE" => Ok(MeasurementState::Discharge),
            _ => Err(Error::Parse(format!("Unknown state: {}", state_str))),
        }
    }

    /// Parse attribute string
    fn parse_attribute(attr_str: &str) -> Result<MeasurementAttribute> {
        match attr_str {
            "NONE" => Ok(MeasurementAttribute::None),
            "OPEN_CIRCUIT" => Ok(MeasurementAttribute::OpenCircuit),
            "SHORT_CIRCUIT" => Ok(MeasurementAttribute::ShortCircuit),
            "GLITCH_CIRCUIT" => Ok(MeasurementAttribute::GlitchCircuit),
            "GOOD_DIODE" => Ok(MeasurementAttribute::GoodDiode),
            "LEO_OHMS" => Ok(MeasurementAttribute::LowOhms),
            "NEGATIVE_EDGE" => Ok(MeasurementAttribute::NegativeEdge),
            "POSITIVE_EDGE" => Ok(MeasurementAttribute::PositiveEdge),
            "HIGH_CURRENT" => Ok(MeasurementAttribute::HighCurrent),
            _ => Err(Error::Parse(format!("Unknown attribute: {}", attr_str))),
        }
    }
}

#[async_trait]
impl Device for FlukeDevice {
    fn device_type(&self) -> DeviceType {
        self.device_type
    }

    async fn connect(&mut self) -> Result<()> {
        let mut port_guard = self.port.lock().await;
        if port_guard.is_some() {
            return Ok(());
        }

        let port_name = self
            .port_name
            .as_ref()
            .ok_or_else(|| Error::Config("No port specified".to_string()))?;

        let port = serialport::new(port_name, 115_200)
            .data_bits(DataBits::Eight)
            .parity(Parity::None)
            .stop_bits(StopBits::One)
            .flow_control(FlowControl::None)
            .timeout(Duration::from_millis(1000))
            .open()?;

        *port_guard = Some(port);

        tracing::info!("Connected to Fluke device on port {}", port_name);
        Ok(())
    }

    async fn disconnect(&mut self) -> Result<()> {
        let mut port_guard = self.port.lock().await;
        if port_guard.is_none() {
            return Ok(());
        }

        *port_guard = None;

        tracing::info!("Disconnected from Fluke device");
        Ok(())
    }

    fn is_connected(&self) -> bool {
        // For simplicity, we'll assume we're connected if we have a port
        // In a more robust implementation, we'd track connection state separately
        true // TODO: Implement proper connection state tracking
    }

    async fn identify(&mut self) -> Result<DeviceInfo> {
        let response = self.send_command_internal("ID").await?;
        Self::parse_ack(&response)?;

        // Parse identification string
        // Format: FLUKE 289,V1.00,95081087
        let parts: Vec<&str> = response.split(',').collect();
        if parts.len() < 3 {
            return Err(Error::Parse("Invalid identification response".to_string()));
        }

        let model = parts[0].trim().to_string();
        let software_version = parts[1].trim().to_string();
        let serial_number = parts[2].trim().to_string();

        Ok(DeviceInfo {
            model,
            serial_number,
            software_version,
        })
    }

    async fn get_measurement(&mut self) -> Result<Measurement> {
        let response = self.send_command_internal("QM").await?;
        Self::parse_ack(&response)?;
        Self::parse_measurement(&response[1..]) // Skip ACK character
    }

    async fn reset(&mut self) -> Result<()> {
        let response = self.send_command_internal("RI").await?;
        Self::parse_ack(&response)
    }

    async fn send_command(&mut self, command: &str) -> Result<String> {
        self.send_command_internal(command).await
    }
}
