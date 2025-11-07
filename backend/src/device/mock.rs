//! Mock device implementation for development and testing
//!
//! This provides a fully functional mock device that simulates a multimeter
//! for development purposes without requiring actual hardware.

use crate::device::{
    Device, DeviceInfo, DeviceType, Measurement, MeasurementAttribute, MeasurementState, Unit,
};
use crate::error::{Error, Result};
use async_trait::async_trait;
use rand::Rng;
use std::f64::consts::PI;
use std::time::{Duration, Instant};

const TAU: f64 = 2.0 * PI;

#[derive(Clone, Copy, Debug)]
enum MockMeasurementProfile {
    VoltageSine {
        offset: f64,
        amplitude: f64,
        frequency_hz: f64,
        noise: f64,
    },
    TemperatureDrift {
        baseline: f64,
        swing: f64,
        period_sec: f64,
        noise: f64,
    },
    ResistanceSweep {
        min: f64,
        max: f64,
        period_sec: f64,
        noise: f64,
    },
    FrequencyPulse {
        baseline: f64,
        swing: f64,
        frequency_hz: f64,
        noise: f64,
    },
    CurrentSine {
        offset: f64,
        amplitude: f64,
        frequency_hz: f64,
        noise: f64,
    },
}

impl MockMeasurementProfile {
    fn unit(&self) -> Unit {
        match self {
            Self::VoltageSine { .. } => Unit::VoltDc,
            Self::TemperatureDrift { .. } => Unit::Celsius,
            Self::ResistanceSweep { .. } => Unit::Ohm,
            Self::FrequencyPulse { .. } => Unit::Hertz,
            Self::CurrentSine { .. } => Unit::AmpDc,
        }
    }

    fn sample(&self, elapsed_sec: f64, rng: &mut impl Rng) -> f64 {
        match self {
            Self::VoltageSine {
                offset,
                amplitude,
                frequency_hz,
                noise,
            } => {
                let offset = *offset;
                let amplitude = *amplitude;
                let frequency_hz = *frequency_hz;
                let noise = *noise;
                let phase = elapsed_sec * frequency_hz * TAU;
                let base = offset + amplitude * phase.sin();
                base + rng.gen_range(-noise..=noise)
            }
            Self::TemperatureDrift {
                baseline,
                swing,
                period_sec,
                noise,
            } => {
                let baseline = *baseline;
                let swing = *swing;
                let period_sec = *period_sec;
                let noise = *noise;
                let period = period_sec.max(60.0);
                let phase = (elapsed_sec / period) * TAU;
                let drift = swing * phase.sin();
                let noise_term = rng.gen_range(-noise..=noise);
                (baseline + drift + noise_term).clamp(-40.0, 150.0)
            }
            Self::ResistanceSweep {
                min,
                max,
                period_sec,
                noise,
            } => {
                let min = *min;
                let max = *max;
                let period_sec = *period_sec;
                let noise = *noise;
                let period = period_sec.max(5.0);
                let phase = (elapsed_sec / period) % 1.0;
                let span = max - min;
                let ramp = if phase < 0.5 {
                    min + span * (phase * 2.0)
                } else {
                    max - span * ((phase - 0.5) * 2.0)
                };
                ramp + rng.gen_range(-noise..=noise)
            }
            Self::FrequencyPulse {
                baseline,
                swing,
                frequency_hz,
                noise,
            } => {
                let baseline = *baseline;
                let swing = *swing;
                let frequency_hz = *frequency_hz;
                let noise = *noise;
                let phase = elapsed_sec * frequency_hz * TAU;
                let modulation = swing * phase.sin();
                (baseline + modulation + rng.gen_range(-noise..=noise)).max(0.0)
            }
            Self::CurrentSine {
                offset,
                amplitude,
                frequency_hz,
                noise,
            } => {
                let offset = *offset;
                let amplitude = *amplitude;
                let frequency_hz = *frequency_hz;
                let noise = *noise;
                let phase = elapsed_sec * frequency_hz * TAU;
                let base = offset + amplitude * phase.sin();
                (base + rng.gen_range(-noise..=noise)).max(0.0)
            }
        }
    }

    fn random(rng: &mut impl Rng) -> Self {
        match rng.gen_range(0..5) {
            0 => Self::VoltageSine {
                offset: rng.gen_range(0.5..12.0),
                amplitude: rng.gen_range(0.25..3.5),
                frequency_hz: rng.gen_range(0.05..0.5),
                noise: rng.gen_range(0.002..0.025),
            },
            1 => Self::TemperatureDrift {
                baseline: rng.gen_range(18.0..35.0),
                swing: rng.gen_range(1.0..6.0),
                period_sec: rng.gen_range(180.0..420.0),
                noise: rng.gen_range(0.05..0.25),
            },
            2 => Self::ResistanceSweep {
                min: rng.gen_range(10.0..500.0),
                max: rng.gen_range(5000.0..50000.0),
                period_sec: rng.gen_range(8.0..20.0),
                noise: rng.gen_range(0.5..25.0),
            },
            3 => Self::FrequencyPulse {
                baseline: rng.gen_range(800.0..1200.0),
                swing: rng.gen_range(50.0..250.0),
                frequency_hz: rng.gen_range(0.2..2.0),
                noise: rng.gen_range(1.0..20.0),
            },
            _ => Self::CurrentSine {
                offset: rng.gen_range(0.2..2.0),
                amplitude: rng.gen_range(0.1..0.8),
                frequency_hz: rng.gen_range(0.1..0.7),
                noise: rng.gen_range(0.001..0.02),
            },
        }
    }
}

/// Mock device implementation
pub struct MockDevice {
    connected: bool,
    measurement_count: u64,
    profile: Option<MockMeasurementProfile>,
    started_at: Option<Instant>,
}

impl MockDevice {
    /// Create a new mock device
    pub fn new() -> Self {
        Self {
            connected: false,
            measurement_count: 0,
            profile: None,
            started_at: None,
        }
    }

    /// Generate a realistic mock measurement
    fn generate_measurement(&mut self) -> Measurement {
        self.measurement_count += 1;
        let mut rng = rand::thread_rng();

        let profile = match self.profile {
            Some(profile) => profile,
            None => {
                let profile = MockMeasurementProfile::random(&mut rng);
                self.profile = Some(profile);
                profile
            }
        };

        let started_at = match self.started_at {
            Some(instant) => instant,
            None => {
                let now = Instant::now();
                self.started_at = Some(now);
                now
            }
        };

        let elapsed = started_at.elapsed().as_secs_f64();
        let value = profile.sample(elapsed, &mut rng);

        Measurement {
            value,
            unit: profile.unit(),
            state: MeasurementState::Normal,
            attribute: MeasurementAttribute::None,
            timestamp: Some(chrono::Utc::now()),
        }
    }
}

#[async_trait]
impl Device for MockDevice {
    fn device_type(&self) -> DeviceType {
        DeviceType::Mock
    }

    async fn connect(&mut self) -> Result<()> {
        if self.connected {
            return Ok(());
        }

        // Simulate connection delay
        tokio::time::sleep(Duration::from_millis(100)).await;

        self.connected = true;
        self.measurement_count = 0;
        self.started_at = Some(Instant::now());
        let mut rng = rand::thread_rng();
        self.profile = Some(MockMeasurementProfile::random(&mut rng));
        tracing::info!("Connected to mock device");
        Ok(())
    }

    async fn disconnect(&mut self) -> Result<()> {
        if !self.connected {
            return Ok(());
        }

        // Simulate disconnection delay
        tokio::time::sleep(Duration::from_millis(50)).await;

        self.connected = false;
        self.profile = None;
        self.started_at = None;
        tracing::info!("Disconnected from mock device");
        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    async fn identify(&mut self) -> Result<DeviceInfo> {
        if !self.connected {
            return Err(Error::Connection("Not connected".to_string()));
        }

        // Simulate identification delay
        tokio::time::sleep(Duration::from_millis(50)).await;

        Ok(DeviceInfo {
            model: "MOCK-MULTIMETER".to_string(),
            serial_number: "MOCK123456".to_string(),
            software_version: "V1.0.0-MOCK".to_string(),
        })
    }

    async fn get_measurement(&mut self) -> Result<Measurement> {
        if !self.connected {
            return Err(Error::Connection("Not connected".to_string()));
        }

        // Simulate measurement delay
        tokio::time::sleep(Duration::from_millis(20)).await;

        Ok(self.generate_measurement())
    }

    async fn reset(&mut self) -> Result<()> {
        if !self.connected {
            return Err(Error::Connection("Not connected".to_string()));
        }

        // Simulate reset delay
        tokio::time::sleep(Duration::from_millis(200)).await;

        self.measurement_count = 0;
        self.started_at = Some(Instant::now());
        tracing::info!("Mock device reset");
        Ok(())
    }

    async fn send_command(&mut self, command: &str) -> Result<String> {
        if !self.connected {
            return Err(Error::Connection("Not connected".to_string()));
        }

        // Simulate command processing delay
        tokio::time::sleep(Duration::from_millis(30)).await;

        // Mock responses for common commands
        match command.to_uppercase().as_str() {
            "ID" => Ok("0\rMOCK-MULTIMETER,V1.0.0-MOCK,MOCK123456\r".to_string()),
            "QM" => {
                let measurement = self.generate_measurement();
                let unit_str = match measurement.unit {
                    Unit::VoltDc => "VDC",
                    Unit::VoltAc => "VAC",
                    Unit::AmpDc => "ADC",
                    Unit::AmpAc => "AAC",
                    Unit::Ohm => "OHM",
                    Unit::Hertz => "Hz",
                    Unit::Celsius => "CEL",
                    Unit::Fahrenheit => "FAR",
                    _ => "NONE",
                };
                let state_str = match measurement.state {
                    MeasurementState::Normal => "NORMAL",
                    MeasurementState::Overload => "OL",
                    _ => "NORMAL",
                };
                let attr_str = match measurement.attribute {
                    MeasurementAttribute::None => "NONE",
                    MeasurementAttribute::GoodDiode => "GOOD_DIODE",
                    MeasurementAttribute::PositiveEdge => "POSITIVE_EDGE",
                    _ => "NONE",
                };
                Ok(format!(
                    "0\r{:.6},{},{},{}\r",
                    measurement.value, unit_str, state_str, attr_str
                ))
            }
            "RI" | "RMP" | "DS" => Ok("0\r".to_string()),
            _ => Ok("1\r".to_string()), // Syntax error for unknown commands
        }
    }
}
