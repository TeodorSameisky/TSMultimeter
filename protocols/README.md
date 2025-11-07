# Multimeter Protocol Documentation

This folder contains protocol documentation for all supported multimeter types in the TSMultimeter project.

## Supported Devices

### Fluke
- **Fluke 289/287**: Serial interface specification for remote communication
  - File: `fluke/fluke-289-287-specification.md`
  - Communication: RS-232 serial at 115200 baud
  - Commands: ID, QM, QDDA, RI, RMP, DS

## Adding New Device Protocols

When adding support for a new multimeter type:

1. Create a new subfolder under `protocols/` named after the manufacturer (e.g., `protocols/manufacturer-name/`)
2. Add the protocol specification as a markdown file
3. Update this README.md to include the new device
4. Implement the corresponding driver in the Rust backend
5. Add tests for the new protocol implementation

## Protocol Documentation Guidelines

Each protocol documentation should include:
- Communication protocol details (baud rate, parity, etc.)
- Command syntax and responses
- Data format specifications
- Error handling information
- Example command/response sequences
- Any special considerations or limitations

## License Information

Protocol documentation may contain copyrighted material from device manufacturers. All such documentation is used for interoperability purposes only and should comply with applicable copyright laws.