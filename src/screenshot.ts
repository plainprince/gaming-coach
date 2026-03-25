import { appConfig } from './config.js';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

/**
 * Screenshot capture module
 * Handles capturing and managing game screenshots
 * Supports quality settings via env vars: width, height (px), scale (%), or preset
 */
// Preset resolutions map
const PRESET_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 },
  '960p': { width: 960, height: 540 },
};

/**
 * Calculate target dimensions based on priority: px > preset > scale
 */
function calculateTargetDimensions(config: typeof appConfig.screenshot): { width: number; height: number } {
  let width = config.width;
  let height = config.height;

  // Priority 1: Check if preset is set and valid
  if (config.preset && config.preset !== 'none' && PRESET_RESOLUTIONS[config.preset]) {
    const preset = PRESET_RESOLUTIONS[config.preset];
    width = preset.width;
    height = preset.height;
  }

  // Priority 2: Apply scale factor
  if (config.scale && config.scale > 0 && config.scale <= 1) {
    width = Math.round(width * config.scale);
    height = Math.round(height * config.scale);
  }

  return { width, height };
}

export class ScreenshotCapture {
  private interval: number;
  private quality: number;
  private outputDir: string;
  private enabled: boolean;
  private targetWidth: number;
  private targetHeight: number;
  private captureTimer: ReturnType<typeof setTimeout> | null = null;
  private lastScreenshotPath: string | null = null;
  private lastScreenshotTime: number = 0;
  private onCapture?: (path: string) => void;
  private onCycleComplete?: () => void;

  constructor() {
    this.interval = appConfig.app.rate * 1000;
    this.quality = appConfig.screenshot.quality;
    this.outputDir = appConfig.screenshot.dir;
    this.enabled = appConfig.screenshot.enabled;
    
    // Calculate target dimensions based on priority: px > preset > scale
    const dims = calculateTargetDimensions(appConfig.screenshot);
    this.targetWidth = dims.width;
    this.targetHeight = dims.height;
  }

  /**
   * Initialize the screenshot capture
   */
  async initialize(): Promise<void> {
    if (!this.enabled) {
      logger.info('[Screenshot] Capture disabled in configuration');
      return;
    }

    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    logger.info(`[Screenshot] Initialized - capturing every ${appConfig.app.rate}s to ${this.outputDir}`);
    logger.info(`[Screenshot] Target resolution: ${this.targetWidth}x${this.targetHeight} (preset: ${appConfig.screenshot.preset}, scale: ${appConfig.screenshot.scale})`);
  }

  /**
   * Set callback for when screenshot is captured
   */
  onCaptureCallback(callback: (path: string) => void): void {
    this.onCapture = callback;
  }

  /**
   * Set callback for when the advice cycle completes
   * This is used to schedule the next screenshot with proper timing
   */
  onCycleCompleteCallback(callback: () => void): void {
    this.onCycleComplete = callback;
  }

  /**
   * Capture a single screenshot
   */
  async capture(): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `gameplay-${timestamp}.png`;
      const filepath = join(this.outputDir, filename);

      // Capture screenshot (primary monitor)
      const imgBuffer = await screenshot({ format: 'png' });
      
      // Resize using sharp to target dimensions (crop to fill, no black bars)
      const resizedBuffer = await sharp(imgBuffer)
        .resize(this.targetWidth, this.targetHeight, {
          fit: 'cover',
          position: 'center'
        })
        .png({ quality: this.quality })
        .toBuffer();
      
      writeFileSync(filepath, resizedBuffer);
      
      this.lastScreenshotPath = filepath;
      this.lastScreenshotTime = Date.now();
      
      logger.info(`[Screenshot] Captured: ${filepath} (${this.targetWidth}x${this.targetHeight})`);
       
      // Keep only 1 screenshot
      this.cleanupOldScreenshots(1);
      
      // Trigger callback if set
      if (this.onCapture) {
        this.onCapture(filepath);
      }

      return filepath;
    } catch (error) {
      logger.error('[Screenshot] Failed to capture:', error as Error);
      return null;
    }
  }

  /**
   * Start automatic screenshot capture at configured interval
   */
  async start(): Promise<void> {
    if (!this.enabled) {
      logger.info('[Screenshot] Auto-capture is disabled');
      return;
    }

    // Capture immediately on start and wait for it to complete
    // This ensures the first screenshot is properly processed
    await this.capture();

    logger.info(`[Screenshot] Auto-capture started (interval: ${this.interval}ms)`);
  }

  /**
   * Schedule the next screenshot capture
   * Called after the previous advice cycle completes to maintain proper timing
   */
  scheduleNextCapture(): void {
    if (!this.enabled) {
      return;
    }

    // Clear any existing timer
    if (this.captureTimer) {
      clearTimeout(this.captureTimer);
      this.captureTimer = null;
    }

    // Always schedule the next capture at the full interval
    // Don't try to "catch up" after long gaps - just maintain regular interval
    const delay = this.interval;

    logger.info(`[Screenshot] Scheduling next capture in ${delay}ms (${this.interval}ms interval)`);

    this.captureTimer = setTimeout(() => {
      this.capture();
    }, delay);
  }

  /**
   * Stop automatic screenshot capture
   */
  stop(): void {
    if (this.captureTimer) {
      clearTimeout(this.captureTimer);
      this.captureTimer = null;
      logger.info('[Screenshot] Auto-capture stopped');
    }
  }

  /**
   * Get the last captured screenshot path
   */
  getLastScreenshot(): string | null {
    return this.lastScreenshotPath;
  }

  /**
   * Check if capture is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clean up old screenshots, keeping only the specified number of recent files
   */
  cleanupOldScreenshots(maxFiles: number = 10): void {
    if (!existsSync(this.outputDir)) {
      return;
    }

    try {
      const files = readdirSync(this.outputDir)
        .filter(f => f.endsWith('.png') && f.startsWith('gameplay-'))
        .map(f => ({
          name: f,
          path: join(this.outputDir, f),
          time: statSync(join(this.outputDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxFiles) {
        const toDelete = files.slice(maxFiles);
        for (const file of toDelete) {
          unlinkSync(file.path);
          logger.info(`[Screenshot] Deleted old screenshot: ${file.name}`);
        }
      }
    } catch (error) {
      logger.error('[Screenshot] Failed to cleanup old screenshots:', error as Error);
    }
  }
}

export default ScreenshotCapture;
