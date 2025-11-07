//! # TSMultimeter Backend
//!
//! This crate provides the backend functionality for TSMultimeter, a PC software
//! application for connecting to multimeters and gathering measurements.
//!
//! ## Architecture
//!
//! The backend is structured into several modules:
//! - `device`: Device communication and protocol implementations
//! - `communication`: IPC communication with the frontend
//! - Error handling and configuration management
//!
//! ## Supported Devices
//!
//! Currently supported multimeter protocols:
//! - Fluke 289/287 (serial interface)

pub mod communication;
pub mod device;
pub mod error;

/// Re-export commonly used types
pub use device::{Device, DeviceType, Measurement, MeasurementState};
pub use error::Error;

/// Initialize the TSMultimeter backend
pub fn init() -> Result<(), Error> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tracing::info!("TSMultimeter backend initialized");
    Ok(())
}
