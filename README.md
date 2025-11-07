# TSMultimeter

A PC software application for connecting to multimeters and gathering measurements.

## Architecture

TSMultimeter consists of two main components:

- **Backend**: Written in Rust, provides HTTP API for device communication
- **Frontend**: Built with TypeScript/React, runs as a web application

Communication between frontend and backend happens via HTTP REST API.

## Features

- Support for Fluke 289/287 multimeters
- Real-time measurement display
- Measurement history and charting
- Mock device for development and testing
- Web-based interface accessible from any modern browser

## Supported Devices

### Fluke
- **Fluke 289/287**: Serial interface at 115200 baud
  - Commands: ID (identification), QM (query measurement), QDDA (query display data), RI (reset), RMP (reset properties), DS (default setup)

## Development Setup

### Prerequisites

- Rust (latest stable version)
- Node.js 18+ and npm

### Backend Setup

```bash
cd backend
cargo build
```

### Frontend Setup

```bash
cd frontend
npm install
npm run build
```

### Running in Development

1. **Start the backend server:**
```bash
cd backend
cargo run
```
This starts the HTTP server on `http://localhost:8080`

2. **In another terminal, start the frontend:**
```bash
cd frontend
npm run dev
```
This starts the development server on `http://localhost:3000`

3. **Open your browser** and navigate to `http://localhost:3000`

The application will automatically connect to the backend API.

### Alternative: Run Frontend in Electron

If you prefer a desktop application experience:

```bash
cd frontend
npm run electron
```

This requires the backend to be running first.

### Testing the API

You can test the backend API directly:

```bash
# Check device status
curl http://localhost:8080/status

# Connect to mock device
curl -X POST http://localhost:8080/connect -H "Content-Type: application/json" -d '{"device_type":"Mock"}'

# Get measurement
curl http://localhost:8080/measurement

# Disconnect
curl -X POST http://localhost:8080/disconnect
```

## Project Structure

```
TSMultimeter/
├── backend/                 # Rust backend
│   ├── src/
│   │   ├── main.rs         # HTTP server entry point
│   │   ├── lib.rs          # Library interface
│   │   ├── device/         # Device communication modules
│   │   │   ├── mod.rs      # Device trait and types
│   │   │   ├── fluke.rs    # Fluke protocol implementation
│   │   │   └── mock.rs     # Mock device for testing
│   │   ├── communication.rs # HTTP API handlers
│   │   └── error.rs        # Error types
│   ├── Cargo.toml
│   └── tauri.conf.json     # Tauri configuration (for future desktop app)
├── frontend/                # TypeScript/React frontend
│   ├── src/
│   │   ├── main.tsx        # React application entry point
│   │   ├── App.tsx         # Main application component
│   │   ├── components/     # React components
│   │   │   ├── DeviceConnection.tsx
│   │   │   ├── MeasurementDisplay.tsx
│   │   │   └── MeasurementHistory.tsx
│   │   └── hooks/          # Custom React hooks
│   │       └── useDevice.ts
│   ├── preload.ts          # Electron preload script
│   ├── electron-main.ts    # Electron main process
│   ├── index.html          # HTML template
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── protocols/               # Device protocol documentation
│   ├── README.md
│   └── fluke/
│       └── fluke-289-287-specification.md
├── .github/
│   └── instructions/
│       └── copilot_instructions.md.instructions.md
└── README.md
```

## Adding New Device Support

1. Add protocol documentation to `protocols/` folder
2. Implement device driver in `backend/src/device/`
3. Update device enumeration in `backend/src/device/mod.rs`
4. Add device option to frontend connection component

## Development Guidelines

See `.github/instructions/copilot_instructions.md.instructions.md` for detailed coding guidelines and development practices.

## License

This project maintains a list of licenses for all used dependencies and components. See the license information in the respective package files.

## Contributing

1. Follow the established coding guidelines
2. Add tests for new functionality
3. Update documentation for any changes
4. Ensure all code is well-documented and maintainable