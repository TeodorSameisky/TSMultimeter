import { app, BrowserWindow, dialog } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let backendProcess: ChildProcess | undefined;

const backendExecutableName = process.platform === 'win32'
  ? 'tsmultimeter-backend.exe'
  : 'tsmultimeter-backend';

const resolveBackendExecutable = (): string | undefined => {
  if (process.env.TSM_BACKEND_PATH) {
    const explicitPath = process.env.TSM_BACKEND_PATH;
    if (fs.existsSync(explicitPath)) {
      return explicitPath;
    }
  }

  const devCandidates = [
    path.resolve(__dirname, '..', '..', 'backend', 'target', 'debug', backendExecutableName),
    path.resolve(__dirname, '..', '..', 'backend', 'target', 'release', backendExecutableName),
  ];

  if (isDev) {
    return devCandidates.find((candidate) => fs.existsSync(candidate));
  }

  const packagedPath = path.join(process.resourcesPath, 'backend', backendExecutableName);
  if (fs.existsSync(packagedPath)) {
    return packagedPath;
  }

  return devCandidates.find((candidate) => fs.existsSync(candidate));
};

const startBackend = (): void => {
  const executablePath = resolveBackendExecutable();

  if (!executablePath) {
    dialog.showErrorBox(
      'Backend Missing',
      'TSMultimeter could not locate the backend service binary. Please build the backend (cargo build --release) and try again.'
    );
    app.quit();
    return;
  }

  backendProcess = spawn(executablePath, [], {
    stdio: isDev ? 'inherit' : 'ignore',
  });

  backendProcess.on('error', (error) => {
    dialog.showErrorBox('Backend Launch Failed', error.message);
    app.quit();
  });

  backendProcess.on('exit', (code) => {
    backendProcess = undefined;
    if (code !== null && code !== 0 && !isDev) {
      dialog.showErrorBox(
        'Backend Exited Unexpectedly',
        `The backend service terminated with exit code ${code}.`
      );
      app.quit();
    }
  });
};

const stopBackend = (): void => {
  if (!backendProcess) {
    return;
  }

  try {
    if (process.platform === 'win32') {
      backendProcess.kill();
    } else {
      backendProcess.kill('SIGTERM');
    }
  } catch (error) {
    if (isDev) {
      console.warn('Failed to terminate backend process', error);
    }
  } finally {
    backendProcess = undefined;
  }
};

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'TSMultimeter',
    icon: path.join(__dirname, 'assets/icon.png'), // Add icon later
    autoHideMenuBar: true,
  });

  mainWindow.setMenuBarVisibility(false);

  // and load the index.html of the app.
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// In this file you can include the rest of your app's main process
// code. You can also put them in separate files and import them here.