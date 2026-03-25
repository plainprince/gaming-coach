import { appConfig, ensureDirectories } from './config.js';
import ScreenshotCapture from './screenshot.js';
import LLMClient from './llm.js';
import TTSEngine from './tts.js';
import Display from './display.js';
import { logger } from './logger.js';

/**
 * Gaming Coach Application
 * Simplified: screenshot > generate advice > auto display
 */
class GamingCoach {
  private screenshotCapture: ScreenshotCapture;
  private llmClient: LLMClient;
  private ttsEngine: TTSEngine;
  private display: Display;
  private isRunning: boolean = false;
  private lastAdvice: string = '';

  constructor() {
    this.screenshotCapture = new ScreenshotCapture();
    this.llmClient = new LLMClient();
    this.ttsEngine = new TTSEngine();
    this.display = new Display();
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    logger.info('Gaming Coach - Initializing...');

    // Ensure required directories exist
    ensureDirectories();

    // Initialize each module
    await this.screenshotCapture.initialize();
    await this.llmClient.initialize();
    await this.ttsEngine.initialize();
    await this.display.initialize();

    // Set up callbacks
    this.setupCallbacks();

    logger.success('Gaming Coach - Ready!');
    logger.info(`LLM: ${appConfig.ollama.model}`);
    logger.info(`Screenshot: every ${appConfig.app.rate}s`);
    logger.info(`TTS: ${appConfig.tts.enabled ? 'enabled' : 'disabled'}`);
    logger.info(`Display: enabled`);
  }

  /**
   * Set up callbacks
   */
  private setupCallbacks(): void {
    // When screenshot is captured, analyze it
    this.screenshotCapture.onCaptureCallback(async (screenshotPath: string) => {
      await this.handleNewScreenshot(screenshotPath);
    });

    // When the advice cycle completes, schedule the next screenshot
    this.screenshotCapture.onCycleCompleteCallback(() => {
      this.screenshotCapture.scheduleNextCapture();
    });
  }

  /**
   * Handle new screenshot - analyze and store advice
   */
  private async handleNewScreenshot(screenshotPath: string): Promise<void> {
    if (!this.llmClient.isReady()) {
      return;
    }

    try {
      const advice = await this.llmClient.analyze(screenshotPath);
      
      if (advice) {
        this.lastAdvice = advice;
        
        // Check if we should persist display during TTS
        const persistDuringTts = this.display.getWindowPersistDuringTts();
        const ttsEnabled = this.ttsEngine.isEnabled();
        
        if (persistDuringTts && ttsEnabled) {
          // Show display first, then run TTS - display will stay visible during TTS
          // and remain visible until TTS completes
          await this.display.show(advice);
          
          // Start TTS without waiting for it to complete
          const ttsPromise = this.ttsEngine.speak(advice);
          
          // Wait for TTS to complete
          await ttsPromise;
          
          // Close the display window after TTS is done
          await this.display.closeWindowManually();
        } else {
          // Normal behavior: show display and speak TTS concurrently
          await Promise.all([
            this.display.show(advice),
            this.ttsEngine.speak(advice)
          ]);
        }
      }

      // Notify that the cycle is complete - this will trigger the next screenshot
      // with proper timing (waiting for the remaining time until RATE seconds
      // have passed since the last screenshot)
      if (this.screenshotCapture.isEnabled() && this.isRunning) {
        this.screenshotCapture.scheduleNextCapture();
      }
    } catch (error) {
      logger.error('[Coach] Analysis failed:', error as Error);
      // Still schedule next capture even if analysis failed
      if (this.screenshotCapture.isEnabled() && this.isRunning) {
        this.screenshotCapture.scheduleNextCapture();
      }
    }
  }

  /**
   * Start the gaming coach
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Startup delay
    if (appConfig.app.startupDelay > 0) {
      logger.info(`[Coach] Starting in ${appConfig.app.startupDelay}s...`);
      await this.delay(appConfig.app.startupDelay * 1000);
    }

    // Start screenshot capture
    if (this.screenshotCapture.isEnabled()) {
      await this.screenshotCapture.start();
    }

    logger.success('[Coach] Running - Press Ctrl+C to stop');
  }

  /**
   * Stop the gaming coach
   */
  async stop(): Promise<void> {
    logger.info('\n[Coach] Shutting down...');

    this.screenshotCapture.stop();

    this.isRunning = false;
    logger.success('[Coach] Stopped');
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main entry point
 */
async function main() {
  const coach = new GamingCoach();

  try {
    await coach.initialize();
    await coach.start();

    // Handle shutdown signals
    process.on('SIGINT', async () => {
      await coach.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await coach.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('[Coach] Fatal error:', error as Error);
    process.exit(1);
  }
}

// Run the application
main();
