//! Device communication module
//!
//! This module provides abstractions for communicating with different types of multimeters.

pub mod fluke;
pub mod mock;

use crate::error::Result;
use serde::{Deserialize, Serialize};

/// Supported device types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeviceType {
    Fluke289,
    Fluke287,
    Mock,
}

/// Measurement units
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum Unit {
    None,
    VoltDc,
    VoltAc,
    AmpDc,
    AmpAc,
    VoltAcPlusDc,
    AmpAcPlusDc,
    Volt, // Used in peak measurements
    Amp,  // Used in peak measurements
    Ohm,
    Siemens,
    Hertz,
    Second,
    Farad,
    Celsius,
    Fahrenheit,
    Percent,
    DecibelM,
    DecibelV,
    Decibel,
    CrestFactor,
}

/// Measurement state
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum MeasurementState {
    Normal,
    Invalid,
    Blank,
    Overload,
    OverloadNegative,
    OpenThermocouple,
    Discharge, // Capacitance discharge error
}

/// Measurement attribute
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum MeasurementAttribute {
    None,
    OpenCircuit,
    ShortCircuit,
    GlitchCircuit,
    GoodDiode,
    LowOhms,
    NegativeEdge,
    PositiveEdge,
    HighCurrent, // Displayed value is flashing
}

/// A single measurement reading
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Measurement {
    pub value: f64,
    pub unit: Unit,
    pub state: MeasurementState,
    pub attribute: MeasurementAttribute,
    pub timestamp: Option<chrono::DateTime<chrono::Utc>>,
}

/// Device identification information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub model: String,
    pub serial_number: String,
    pub software_version: String,
}

/// Common trait for all multimeter devices
#[async_trait::async_trait]
pub trait Device: Send + Sync {
    /// Get device type
    fn device_type(&self) -> DeviceType;

    /// Connect to the device
    async fn connect(&mut self) -> Result<()>;

    /// Disconnect from the device
    async fn disconnect(&mut self) -> Result<()>;

    /// Check if device is connected
    fn is_connected(&self) -> bool;

    /// Get device identification information
    async fn identify(&mut self) -> Result<DeviceInfo>;

    /// Get primary measurement
    async fn get_measurement(&mut self) -> Result<Measurement>;

    /// Reset device to factory settings
    async fn reset(&mut self) -> Result<()>;

    /// Send a raw command and get response
    async fn send_command(&mut self, command: &str) -> Result<String>;
}

/// Create a device instance based on device type
pub fn create_device(device_type: DeviceType, port: Option<String>) -> Box<dyn Device> {
    match device_type {
        DeviceType::Fluke289 | DeviceType::Fluke287 => {
            Box::new(fluke::FlukeDevice::new(device_type, port))
        }
        DeviceType::Mock => Box::new(mock::MockDevice::new()),
    }
}
