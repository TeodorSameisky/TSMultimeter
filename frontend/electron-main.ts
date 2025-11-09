import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { PopoutDescriptor } from './src/types/popout';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let backendProcess: ChildProcess | undefined;
const popoutWindows = new Map<string, { window: BrowserWindow; descriptor: PopoutDescriptor }>();

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

const createPopoutQuery = (descriptor: PopoutDescriptor): URLSearchParams => {
  const query = new URLSearchParams({
    channelId: descriptor.channelId,
    channelName: descriptor.channelName,
    channelType: descriptor.channelType,
    color: descriptor.color,
  });

  if (typeof descriptor.precision === 'number') {
    query.set('precision', String(descriptor.precision));
  }
  if (descriptor.unit) {
    query.set('unit', descriptor.unit);
  }
  if (descriptor.deviceId) {
    query.set('deviceId', descriptor.deviceId);
  }
  if (descriptor.expression) {
    query.set('expression', descriptor.expression);
  }
  if (descriptor.inputs && descriptor.inputs.length > 0) {
    query.set('inputs', JSON.stringify(descriptor.inputs));
  }

  return query;
};

const loadPopoutContent = (windowRef: BrowserWindow, descriptor: PopoutDescriptor): void => {
  const queryParams = createPopoutQuery(descriptor);

  if (isDev) {
    windowRef.loadURL(`http://localhost:3000/popout.html?${queryParams.toString()}`);
  } else {
    windowRef.loadFile(path.join(__dirname, '../dist/popout.html'), {
      query: Object.fromEntries(queryParams.entries()),
    });
  }
};

const descriptorsEqual = (a: PopoutDescriptor, b: PopoutDescriptor): boolean => {
  if (a.channelId !== b.channelId) {
    return false;
  }
  if (a.channelName !== b.channelName || a.color !== b.color || a.channelType !== b.channelType) {
    return false;
  }
  if ((a.unit ?? '') !== (b.unit ?? '')) {
    return false;
  }
  if ((a.deviceId ?? '') !== (b.deviceId ?? '')) {
    return false;
  }
  if ((a.expression ?? '') !== (b.expression ?? '')) {
    return false;
  }
  if ((a.precision ?? null) !== (b.precision ?? null)) {
    return false;
  }

  const inputsA = a.inputs ?? [];
  const inputsB = b.inputs ?? [];
  if (inputsA.length !== inputsB.length) {
    return false;
  }
  for (let index = 0; index < inputsA.length; index += 1) {
    const left = inputsA[index];
    const right = inputsB[index];
    if (!right || left.channelId !== right.channelId || left.variable !== right.variable) {
      return false;
    }
  }
  return true;
};

const createPopoutWindow = (descriptor: PopoutDescriptor): BrowserWindow => {
  const popoutWindow = new BrowserWindow({
    width: 320,
    height: 180,
    minWidth: 220,
    minHeight: 120,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: true,
    show: false,
    hasShadow: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: `${descriptor.channelName} - Popout`,
  });

  loadPopoutContent(popoutWindow, descriptor);

  popoutWindow.once('ready-to-show', () => {
    popoutWindow.show();
  });

  popoutWindow.on('closed', () => {
    popoutWindows.delete(descriptor.channelId);
  });

  popoutWindow.setAlwaysOnTop(true, 'screen-saver');
  popoutWindow.setMenuBarVisibility(false);

  popoutWindows.set(descriptor.channelId, { window: popoutWindow, descriptor });
  return popoutWindow;
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

  ipcMain.handle('sync-popouts', async (_, descriptors: PopoutDescriptor[] = []) => {
    const desiredIds = new Set(descriptors.map((descriptor) => descriptor.channelId));

    // Close popouts that are no longer requested.
    for (const [channelId, entry] of Array.from(popoutWindows.entries())) {
      if (desiredIds.has(channelId)) {
        continue;
      }
      const { window } = entry;
      if (!window.isDestroyed()) {
        window.close();
      } else {
        popoutWindows.delete(channelId);
      }
    }

    // Ensure every descriptor has a matching window with up-to-date parameters.
    for (const descriptor of descriptors) {
      const existing = popoutWindows.get(descriptor.channelId);
      if (!existing) {
        createPopoutWindow(descriptor);
        continue;
      }

      const { window, descriptor: previous } = existing;
      if (window.isDestroyed()) {
        popoutWindows.delete(descriptor.channelId);
        createPopoutWindow(descriptor);
        continue;
      }

      if (!descriptorsEqual(previous, descriptor)) {
        loadPopoutContent(window, descriptor);
        popoutWindows.set(descriptor.channelId, { window, descriptor });
      }
    }
  });

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