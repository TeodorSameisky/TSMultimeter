//! Fluke 289/287 device implementation
//!
//! Implements the serial communication protocol for Fluke 289 and 287 multimeters.

use crate::device::{
    Device, DeviceInfo, DeviceType, Measurement, MeasurementAttribute, MeasurementState, Unit,
};
use crate::error::{Error, Result};
use async_trait::async_trait;
use serialport::{ClearBuffer, DataBits, FlowControl, Parity, SerialPort, StopBits};
use std::io::{Read, Write};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

const ACK_TIMEOUT: Duration = Duration::from_secs(5);
const PAYLOAD_IDLE_TIMEOUT: Duration = Duration::from_millis(750);
const READ_BACKOFF: Duration = Duration::from_millis(10);

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

    let command_bytes = format!("{}\r", command).into_bytes();
    tracing::debug!(command = %command, bytes = ?command_bytes, "Sending command");
    port.write_all(&command_bytes)?;
    port.flush()?;

        // Small delay for device to process
    tokio::time::sleep(Duration::from_millis(50)).await;

        // Read response, capturing both ACK line and optional payload line.
        let mut buffer = [0u8; 1024];
        let mut response = String::new();
        let mut carriage_returns = 0usize;
        let mut ack_received = false;
        let mut last_activity = Instant::now();

        loop {
            match port.read(&mut buffer) {
                Ok(bytes_read) if bytes_read > 0 => {
                    let raw_chunk = &buffer[..bytes_read];
                    let chunk = String::from_utf8_lossy(raw_chunk);
                    tracing::debug!(command = %command, raw = ?raw_chunk, chunk = %chunk, "Received serial chunk");
                    carriage_returns += chunk.matches('\r').count();
                    response.push_str(&chunk);
                    last_activity = Instant::now();

                    // Most commands emit an ACK line (ending with CR) and for
                    // queries an additional payload line (ending with CR). We
                    // continue reading until we either receive both, or we've
                    // seen at least one CR and additional reads time out.
                    if carriage_returns >= 2 {
                        break;
                    }
                    ack_received = ack_received || carriage_returns >= 1;
                }
                Ok(_) => {}
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    let elapsed = last_activity.elapsed();
                    if !ack_received {
                        if elapsed > ACK_TIMEOUT {
                            tracing::warn!(command = %command, "Timeout before ACK");
                            return Err(Error::Timeout);
                        }
                    } else if elapsed > PAYLOAD_IDLE_TIMEOUT {
                        // Treat as ACK-only response; payload likely absent.
                        break;
                    }
                }
                Err(e) => return Err(e.into()),
            }

            tokio::time::sleep(READ_BACKOFF).await;
        }

        // Normalise by stripping carriage returns/newlines so the caller sees
        // the ACK followed directly by any payload content.
        if response.is_empty() {
            return Err(Error::Timeout);
        }

            let mut lines = response
                .split('\r')
                .map(|line| line.trim_end_matches('\n'))
                .filter(|line| !line.is_empty());

        let ack_line = lines
            .next()
            .ok_or_else(|| Error::Parse("Missing ACK".to_string()))?;

        let mut output = String::from(ack_line);
        for line in lines {
            output.push_str(line);
        }

        Ok(output)
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

        let mut port = serialport::new(port_name, 115_200)
            .data_bits(DataBits::Eight)
            .parity(Parity::None)
            .stop_bits(StopBits::One)
            .flow_control(FlowControl::None)
            .timeout(Duration::from_millis(1000))
            .open()?;

        if let Err(error) = port.write_data_terminal_ready(true) {
            tracing::warn!(%error, "Failed to assert DTR line");
        }
        if let Err(error) = port.write_request_to_send(true) {
            tracing::warn!(%error, "Failed to assert RTS line");
        }
        if let Err(error) = port.clear(ClearBuffer::All) {
            tracing::warn!(%error, "Failed to clear serial buffers");
        }

        tokio::time::sleep(Duration::from_millis(150)).await;

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
        let payload = response
            .get(1..)
            .ok_or_else(|| Error::Parse("Identification payload missing".to_string()))?;
        let parts: Vec<&str> = payload.split(',').collect();
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
        let payload = response
            .get(1..)
            .ok_or_else(|| Error::Parse("Measurement payload missing".to_string()))?;
        Self::parse_measurement(payload)
    }

    async fn reset(&mut self) -> Result<()> {
        let response = self.send_command_internal("RI").await?;
        Self::parse_ack(&response)
    }

    async fn send_command(&mut self, command: &str) -> Result<String> {
        self.send_command_internal(command).await
    }
}
