---
applyTo: '**'
---
# TSMultimeter Copilot Instructions

## Project Overview
TSMultimeter is a PC software application designed for connecting to multimeters and gathering measurements. The application consists of two main components:

- **Backend**: Written in Rust, responsible for handling communication protocols (serial, telnet, etc.) with multimeter devices
- **Frontend**: Built with TypeScript/React and packaged with Electron for cross-platform desktop deployment

## Architecture
- **Backend (Rust)**: Core communication layer, device drivers, data processing, and measurement collection
- **Frontend (TypeScript/React/Electron)**: User interface for device configuration, measurement display, data visualization, and application controls
- **Communication**: Frontend communicates with backend via IPC (Inter-Process Communication) in Electron

## Coding Guidelines

### Rust Backend Guidelines
- Use modern Rust idioms and patterns (2021 edition)
- Implement proper error handling with `Result` and `Option` types
- Use async/await for I/O operations where appropriate
- Follow naming conventions: snake_case for functions/variables, PascalCase for types
- Include comprehensive documentation with `///` comments
- Write unit tests for all public functions
- Use Cargo for dependency management

### TypeScript/React Frontend Guidelines
- Use TypeScript for all new code (strict mode enabled)
- Follow React functional components with hooks
- Use modern ES6+ features
- Implement proper TypeScript interfaces for data structures
- Follow camelCase naming conventions
- Use ESLint and Prettier for code formatting
- Write unit tests with Jest/React Testing Library
- Use npm/yarn for dependency management

### General Guidelines
- Maintain clear separation between backend and frontend concerns
- Implement proper logging and error reporting
- Follow security best practices (input validation, safe serialization)
- Use version control with meaningful commit messages
- Document APIs and interfaces clearly
- Write maintainable, readable code with appropriate comments
- Ensure all written code is well-documented and structured for long-term sustainability
- Always make sure that obsolete code is removed
- Design reusable components and modules when possible to promote code reuse and maintainability

## Documentation Guidelines
- Maintain a comprehensive README.md file with detailed documentation on how everything works
- Include project overview, architecture diagrams, setup instructions, API documentation, and usage examples
- Update documentation whenever code changes are made to keep it current and accurate
- Use clear, concise language in documentation suitable for both developers and end-users
- Maintain a dedicated folder with protocol documentation for each supported multimeter type
- Maintain a list with licenses for all used elements (dependencies, libraries, assets)

## Development Workflow
- Backend changes should be tested with Rust's test framework
- Frontend changes should be tested in Electron environment
- Integration testing between frontend and backend via IPC
- Use Git for version control with feature branches
- Maintain a fully functional mock device for development and testing purposes
- Implement comprehensive testing strategy including unit tests, integration tests, and end-to-end tests
- Use continuous integration for automated testing and building

## Code Review Guidelines
- Ensure type safety in TypeScript code
- Verify error handling in Rust code
- Check for proper resource management (memory, file handles)
- Validate IPC communication patterns
- Confirm adherence to project architecture
- Review test coverage for new features
- Verify security best practices are followed
- Check for performance implications of changes

## Security Guidelines
- Implement secure communication protocols for device connections
- Validate all input data from external sources
- Use secure serialization/deserialization practices
- Implement proper authentication and authorization if needed
- Follow OWASP guidelines for web security aspects
- Ensure safe handling of sensitive measurement data

## Performance Guidelines
- Optimize I/O operations, especially for real-time data collection
- Minimize memory usage in resource-constrained environments
- Implement efficient data structures for measurement storage
- Use asynchronous programming where appropriate to avoid blocking
- Profile and optimize critical paths in measurement processing

## Configuration and Data Management
- Implement centralized configuration management
- Use appropriate data persistence for measurement history
- Handle configuration updates gracefully
- Implement data export/import functionality
- Ensure thread-safe access to shared data structures