
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.setActivationPolicy('accessory');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('window-all-closed', () => {
  app.quit();
});

app.whenReady().then(() => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Window dimensions
  const windowWidth = 350;
  const windowHeight = 120;
  
  // Calculate position based on configuration
  let x, y;
  const position = 'center';

  if (position.includes('%')) {
    const [xPercent, yPercent] = position.split(',').map(p => parseFloat(p) / 100);
    x = Math.floor(screenWidth * xPercent - windowWidth / 2);
    y = Math.floor(screenHeight * yPercent - windowHeight / 2);
  
    // Ensure window doesn't go off-screen
    x = Math.max(0, Math.min(x, screenWidth - windowWidth));
    y = Math.max(0, Math.min(y, screenHeight - windowHeight));
  } else {
    switch (position) {
      case 'top-left':
        x = 50;
        y = 50;
        break;
      case 'top-right':
        x = screenWidth - windowWidth - 50;
        y = 50;
        break;
      case 'bottom-left':
        x = 50;
        y = screenHeight - windowHeight - 50;
        break;
      case 'bottom-right':
        x = screenWidth - windowWidth - 50;
        y = screenHeight - windowHeight - 50;
        break;
      case 'center':
      default:
        x = Math.floor((screenWidth - windowWidth) / 2);
        y = Math.floor((screenHeight - windowHeight) / 2);
        break;
    }
  }
  
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Set always on top level to screen-saver to avoid stealing focus from games
  win.setAlwaysOnTop(true, 'screen-saver');
  
  // Prevent the window from stealing focus
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  
   // Show the window without activating/focusing it
  win.once('ready-to-show', () => {
    win.showInactive();
  });
  win.loadFile('/Users/simeonkummer/dev/gaming-coach/temp_overlay.html');
  
  
});
