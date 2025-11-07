//! IPC communication module
//!
//! This module handles communication between the Rust backend and the TypeScript frontend
//! using Tauri's IPC system.

use crate::device::{create_device, Device, DeviceInfo, DeviceType};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

struct ManagedDevice {
    device_type: DeviceType,
    info: DeviceInfo,
    device: Box<dyn Device>,
}

/// Global application state
pub struct AppState {
    devices: HashMap<String, ManagedDevice>,
    next_device_id: u32,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            devices: HashMap::new(),
            next_device_id: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ConnectDeviceResponse {
    pub id: String,
    pub device_type: DeviceType,
    pub info: DeviceInfo,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeviceListItem {
    pub id: String,
    pub device_type: DeviceType,
    pub info: DeviceInfo,
    pub connected: bool,
}

/// Connect to a device
pub async fn connect_device(
    device_type: String,
    port: Option<String>,
    state: &Arc<Mutex<AppState>>,
) -> std::result::Result<ConnectDeviceResponse, String> {
    let device_type_enum = match device_type.as_str() {
        "Fluke289" => DeviceType::Fluke289,
        "Fluke287" => DeviceType::Fluke287,
        "Mock" => DeviceType::Mock,
        _ => return Err("Invalid device type".to_string()),
    };

    let mut device = create_device(device_type_enum, port);
    device
        .connect()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let info = device
        .identify()
        .await
        .map_err(|e| format!("Failed to identify device: {}", e))?;

    let mut state_guard = state.lock().await;
    let device_id = format!("device_{:04}", state_guard.next_device_id);
    state_guard.next_device_id += 1;

    state_guard.devices.insert(
        device_id.clone(),
        ManagedDevice {
            device_type: device_type_enum,
            info: info.clone(),
            device,
        },
    );

    Ok(ConnectDeviceResponse {
        id: device_id,
        device_type: device_type_enum,
        info,
    })
}

/// Disconnect from a device
pub async fn disconnect_device(
    device_id: String,
    state: &Arc<Mutex<AppState>>,
) -> std::result::Result<String, String> {
    let mut state_guard = state.lock().await;

    if let Some(mut managed_device) = state_guard.devices.remove(&device_id) {
        managed_device
            .device
            .disconnect()
            .await
            .map_err(|e| format!("Failed to disconnect: {}", e))?;
        Ok(format!("Disconnected device {}", device_id))
    } else {
        Err(format!("Device {} not found", device_id))
    }
}

/// Get current measurement
pub async fn get_measurement(
    device_id: String,
    state: &Arc<Mutex<AppState>>,
) -> std::result::Result<serde_json::Value, String> {
    let mut state_guard = state.lock().await;

    if let Some(managed_device) = state_guard.devices.get_mut(&device_id) {
        let measurement = managed_device
            .device
            .get_measurement()
            .await
            .map_err(|e| format!("Failed to get measurement: {}", e))?;
        Ok(serde_json::to_value(measurement).map_err(|e| format!("Serialization error: {}", e))?)
    } else {
        Err(format!("Device {} not found", device_id))
    }
}

/// Get device status
pub async fn get_device_status(
    device_id: String,
    state: &Arc<Mutex<AppState>>,
) -> std::result::Result<DeviceListItem, String> {
    let state_guard = state.lock().await;

    if let Some(managed_device) = state_guard.devices.get(&device_id) {
        Ok(DeviceListItem {
            id: device_id,
            device_type: managed_device.device_type,
            info: managed_device.info.clone(),
            connected: managed_device.device.is_connected(),
        })
    } else {
        Err(format!("Device {} not found", device_id))
    }
}

/// Reset device
pub async fn reset_device(
    device_id: String,
    state: &Arc<Mutex<AppState>>,
) -> std::result::Result<String, String> {
    let mut state_guard = state.lock().await;

    if let Some(managed_device) = state_guard.devices.get_mut(&device_id) {
        managed_device
            .device
            .reset()
            .await
            .map_err(|e| format!("Failed to reset device: {}", e))?;
        Ok("Device reset successfully".to_string())
    } else {
        Err(format!("Device {} not found", device_id))
    }
}

/// Send raw command to device
pub async fn send_raw_command(
    device_id: String,
    command: String,
    state: &Arc<Mutex<AppState>>,
) -> std::result::Result<String, String> {
    let mut state_guard = state.lock().await;

    if let Some(managed_device) = state_guard.devices.get_mut(&device_id) {
        let response = managed_device
            .device
            .send_command(&command)
            .await
            .map_err(|e| format!("Failed to send command: {}", e))?;
        Ok(response)
    } else {
        Err(format!("Device {} not found", device_id))
    }
}

/// Get list of connected devices
pub async fn get_connected_devices(
    state: &Arc<Mutex<AppState>>,
) -> std::result::Result<Vec<DeviceListItem>, String> {
    let state_guard = state.lock().await;

    let device_list = state_guard
        .devices
        .iter()
        .map(|(id, managed_device)| DeviceListItem {
            id: id.clone(),
            device_type: managed_device.device_type,
            info: managed_device.info.clone(),
            connected: managed_device.device.is_connected(),
        })
        .collect();

    Ok(device_list)
}

/// Get available serial ports
pub fn get_available_ports() -> std::result::Result<Vec<String>, String> {
    let ports = serialport::available_ports()
        .map_err(|e| format!("Failed to get available ports: {:?}", e))?
        .into_iter()
        .map(|p| p.port_name)
        .collect();

    Ok(ports)
}
