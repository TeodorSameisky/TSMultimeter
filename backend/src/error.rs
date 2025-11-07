//! Error types for the TSMultimeter backend

/// Main error type for the TSMultimeter backend
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Serial communication error: {0}")]
    Serial(#[from] serialport::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("Device error: {0}")]
    Device(String),

    #[error("Timeout error")]
    Timeout,

    #[error("Invalid command: {0}")]
    InvalidCommand(String),

    #[error("Connection error: {0}")]
    Connection(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
