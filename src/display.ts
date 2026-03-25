import { appConfig } from './config.js';
import { logger } from './logger.js';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Display module for showing coaching advice
 * Uses electron-overlay-window for cross-platform transparent overlay
 */
export class Display {
  private windowEnabled: boolean;
  private windowPosition: string;
  private windowTransparency: number;
  private windowNoFocus: boolean;
  private windowPersistDuringTts: boolean;
  private lastDisplayTime: number = 0;
  private minInterval: number = 2000;
  private electronProcess: any = null;
  private tempHtmlPath: string;
  private currentDisplayTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.windowEnabled = appConfig.display.window.enabled;
    this.windowPosition = appConfig.display.window.position;
    this.windowTransparency = appConfig.display.window.transparency;
    this.windowNoFocus = appConfig.display.window.noFocus;
    this.windowPersistDuringTts = appConfig.display.window.persistDuringTts;
    this.tempHtmlPath = join(process.cwd(), 'temp_overlay.html');
  }

  /**
   * Initialize the display module
   */
  async initialize(): Promise<void> {
    logger.info('[Display] Initialized');
    logger.info(`[Display] Console output: enabled`);
    logger.info(`[Display] Floating window: ${this.windowEnabled ? 'enabled' : 'disabled'}`);
    if (this.windowEnabled) {
      logger.info(`[Display] Window position: ${this.windowPosition}`);
      logger.info(`[Display] Window transparency: ${this.windowTransparency}`);
      logger.info(`[Display] Window no-focus: ${this.windowNoFocus}`);
      logger.info(`[Display] Window persist during TTS: ${this.windowPersistDuringTts}`);
    }
  }

  /**
   * Show coaching advice
   */
  async show(advice: string): Promise<void> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastDisplayTime < this.minInterval) {
      return;
    }
    this.lastDisplayTime = now;

    // Console output (always enabled)
    logger.info(`\nCoaching: ${advice}`);

    // Floating window (if enabled)
    if (this.windowEnabled) {
      await this.showFloatingWindow(advice);
    }
  }

  /**
   * Show floating window with coaching advice
   * Uses electron-overlay-window for cross-platform overlay
   */
  private async showFloatingWindow(advice: string): Promise<void> {
    try {
      // Create HTML for the overlay
      const html = this.createOverlayHtml(advice);
      writeFileSync(this.tempHtmlPath, html);

      // Kill any existing electron process
      if (this.electronProcess) {
        this.electronProcess.kill();
      }

      // Create electron script with proper position calculation
      // If persistDuringTts is enabled, we won't auto-close, otherwise use the configured duration
      const autoCloseScript = this.windowPersistDuringTts
        ? ''  // No auto-close when persisting during TTS
        : `// Auto-close after ${appConfig.display.window.duration} seconds
           setTimeout(() => {
             win.close();
             app.quit();
           }, ${appConfig.display.window.duration * 1000});`;
      
      const electronScript = `
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();
app.whenReady().then(() => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Window dimensions
  const windowWidth = 350;
  const windowHeight = 120;
  
  // Calculate position based on configuration
  let x, y;
  const position = '${this.windowPosition}';

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
  
  // Show the window only after it's ready, without activating/focusing it
  win.once('ready-to-show', () => {
    win.show();
  });
  win.loadFile('${this.tempHtmlPath.replace(/\\/g, '\\\\')}');
  
  ${autoCloseScript}
});
`;

      const scriptPath = join(process.cwd(), 'temp_overlay.cjs');
      writeFileSync(scriptPath, electronScript);

      // Spawn electron
      this.electronProcess = spawn('electron', [scriptPath], {
        stdio: 'ignore',
        detached: true
      });

      this.electronProcess.unref();

      // Clean up script after a delay
      setTimeout(() => {
        try {
          if (existsSync(scriptPath)) unlinkSync(scriptPath);
          if (existsSync(this.tempHtmlPath)) unlinkSync(this.tempHtmlPath);
        } catch (e) {}
      }, 10000);

      logger.info('[Display] Showed floating window');
    } catch (error) {
      logger.error('[Display] Failed to show floating window:', error as Error);
    }
  }

  /**
   * Create HTML for the overlay
   */
  private createOverlayHtml(advice: string): string {
    const escapedAdvice = advice.replace(/</g, '<').replace(/>/g, '>');
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: rgba(0, 0, 0, ${this.windowTransparency});
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      padding: 15px;
      border-radius: 10px;
      overflow: hidden;
      -webkit-app-region: no-drag;
    }
    .message {
      word-wrap: break-word;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="message">${escapedAdvice}</div>
</body>
</html>`;
  }

  /**
   * Check if display is enabled
   */
  isEnabled(): boolean {
    return true;
  }

  /**
   * Check if window is enabled
   */
  isWindowEnabled(): boolean {
    return this.windowEnabled;
  }

  /**
   * Get window persist during TTS setting
   */
  getWindowPersistDuringTts(): boolean {
    return this.windowPersistDuringTts;
  }

  /**
   * Extend the display window duration to persist during TTS
   */
  async extendDisplayDuration(ttsDurationMs: number): Promise<void> {
    if (this.currentDisplayTimeout) {
      clearTimeout(this.currentDisplayTimeout);
      // Extend the window to stay open for the TTS duration plus a little extra
      this.currentDisplayTimeout = setTimeout(() => {
        this.closeWindow();
      }, ttsDurationMs + 1000); // Add 1 second buffer after TTS
    }
  }

  /**
   * Close the display window immediately
   */
  private closeWindow(): void {
    if (this.electronProcess) {
      try {
        this.electronProcess.kill();
        this.electronProcess = null;
      } catch (error) {
        logger.warn('[Display] Could not close window: ' + (error as Error).message);
      }
    }
  }
  
  /**
   * Close the display window manually
   */
  async closeWindowManually(): Promise<void> {
    this.closeWindow();
  }
}

export default Display;
