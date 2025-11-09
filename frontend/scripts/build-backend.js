#!/usr/bin/env node
// Builds the Rust backend in release mode before packaging.
const { spawn } = require('child_process');
const path = require('path');

const backendDir = path.resolve(__dirname, '..', '..', 'backend');
const cargoCommand = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const cargoArgs = ['build', '--release'];

const cargo = spawn(cargoCommand, cargoArgs, {
  cwd: backendDir,
  stdio: 'inherit',
  shell: false,
});

cargo.on('exit', (code) => {
  process.exit(code ?? 0);
});

cargo.on('error', (error) => {
  console.error('Failed to start cargo:', error);
  process.exit(1);
});
