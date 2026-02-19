import { app, BrowserWindow } from 'electron';
import path from 'path';

// Initialize database
import { initDatabase, closeDatabase } from './database/init';

// Voice Loop Engine
import { createVoiceLoopEngine, VoiceLoopEventType } from './voice-loop';

// IPC Handlers
import { registerIPCHandlers, unregisterIPCHandlers } from './ipc/handlers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let voiceLoopEngine: ReturnType<typeof createVoiceLoopEngine> | null = null;

const createWindow = async (): Promise<void> => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'ZapAtende Voice Assistant',
  });

  // In development, electron-forge plugin provides dev server
  if (!app.isPackaged) {
    // Development mode: load from Vite dev server
    // Vite will use port 5173 or next available (5174, 5175, etc.)
    const tryPorts = [5173, 5174, 5175, 5176, 5177];
    let loaded = false;
    
    for (const port of tryPorts) {
      try {
        await mainWindow.loadURL(`http://localhost:${port}`);
        loaded = true;
        break;
      } catch (error) {
        // Try next port
      }
    }
    
    if (!loaded) {
      await mainWindow.loadURL('http://localhost:5173');
    }
    
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: load from built HTML file
    const rendererPath = path.join(__dirname, '../renderer/main_window/index.html');
    await mainWindow.loadFile(rendererPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  // Initialize database first - this is critical
  try {
    initDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Don't continue if database fails
    app.quit();
    return;
  }

  // Initialize voice loop engine
  voiceLoopEngine = createVoiceLoopEngine({
    silenceThresholdMs: 1500,
    minTurnDurationMs: 500,
    maxTurnDurationMs: 30000,
    maxTurns: 10,
    autoPauseOnTakeover: true,
    enableConfidenceTakeover: true,
    minConfidenceThreshold: 0.5,
  });

  // Register IPC handlers
  registerIPCHandlers({ voiceLoopEngine });

  // Forward voice loop events to renderer
  voiceLoopEngine.on(VoiceLoopEventType.STATE_CHANGED, (event) => {
    if (mainWindow) {
      const data = event.data;
      if ('newState' in data) {
        mainWindow.webContents.send('voice-loop:state-changed', data.newState);
      }
    }
  });

  voiceLoopEngine.on(VoiceLoopEventType.TRANSCRIPTION_READY, (event) => {
    if (mainWindow) {
      const data = event.data;
      if ('text' in data) {
        mainWindow.webContents.send('voice-loop:transcription', data);
      }
    }
  });

  voiceLoopEngine.on(VoiceLoopEventType.AI_RESPONSE_READY, (event) => {
    if (mainWindow) {
      const data = event.data;
      if ('text' in data) {
        mainWindow.webContents.send('voice-loop:ai-response', data);
      }
    }
  });

  voiceLoopEngine.on(VoiceLoopEventType.HUMAN_TAKEOVER_TRIGGERED, (event) => {
    if (mainWindow) {
      const data = event.data;
      if ('trigger' in data) {
        mainWindow.webContents.send('voice-loop:human-takeover', data);
      }
    }
  });

  console.log('Voice loop engine initialized');

  // Create main window
  createWindow();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up on app quit
app.on('before-quit', () => {
  if (voiceLoopEngine) {
    voiceLoopEngine.destroy();
  }
  unregisterIPCHandlers();
  closeDatabase();
});
