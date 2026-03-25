import { appConfig } from './config.js';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Text-to-Speech module using platform-specific TTS (espeak/say/Windows TTS)
 */
export class TTSEngine {
  /** TTS provider: 'auto' uses platform-specific TTS, 'none' disables TTS */
  private provider: 'auto' | 'none';
  private enabled: boolean;
  private rate: number;
  private pitch: number;

  constructor() {
    this.provider = appConfig.tts.provider;
    this.enabled = appConfig.tts.enabled;
    this.rate = appConfig.tts.rate;
    this.pitch = appConfig.tts.pitch;
  }

  /**
   * Initialize the TTS engine
   */
  async initialize(): Promise<void> {
    if (!this.enabled) {
      logger.info('[TTS] Disabled in configuration');
      return;
    }

    logger.info(`[TTS] Initialized with provider: ${this.provider} (platform TTS)`);
  }

  /**
   * Speak the given text
   */
  async speak(text: string): Promise<void> {
    if (!this.enabled || this.provider === 'none') {
      logger.info('[TTS] Disabled, skipping speech');
      return;
    }

    if (!text) {
      return;
    }

    // Truncate for TTS
    const truncatedText = text.substring(0, 200);

    logger.info(`[TTS] Speaking: ${truncatedText}`);

    try {
      await this.speakFallback(truncatedText);
    } catch (error) {
      logger.error('[TTS] Speech failed:', error as Error);
    }
  }

  /**
   * Fallback: use platform-specific TTS
   *
   * Platform-specific parameters:
   * - macOS say: -r <wpm> (default 175). Note: pitch (-p) is NOT supported on macOS.
   * - Linux espeak: -s <speed> (default 170), -p <pitch> (default 50, range 0-99)
   * - Windows PowerShell: Rate property (-10 to 10), pitch requires SSML
   */
  private async speakFallback(text: string): Promise<void> {
    const platform = process.platform;
    
    if (platform === 'darwin') {
      // macOS: use say command with rate only (pitch not supported)
      // rate: config 0.5-2.0 maps to ~87-350 WPM (using rate * 175 as baseline)
      // Note: macOS say does NOT support -p (pitch) parameter
      const escapedText = text.replace(/"/g, '\\"');
      const wpm = Math.round(this.rate * 175); // Convert to words per minute
      await execAsync(`say -r ${wpm} "${escapedText}"`);
    } else if (platform === 'linux') {
      // Linux: use espeak with speed and pitch
      // speed: config 0.5-2.0 maps to ~85-340 WPM (using rate * 170 as baseline)
      // pitch: config -10 to 10 maps to 0-99 (using 50 as baseline + pitch * 5)
      const escapedText = text.replace(/"/g, '\\"');
      const speed = Math.round(this.rate * 170); // Convert to words per minute
      const pitch = Math.max(0, Math.min(99, Math.round(50 + this.pitch * 5))); // Map -10..10 to 0..99
      await execAsync(`espeak -s ${speed} -p ${pitch} "${escapedText}"`);
    } else if (platform === 'win32') {
      // Windows: use PowerShell TTS with rate
      // Rate: config 0.5-2.0 maps to -5 to 10 (1.0 = 0, below 1.0 = negative, above 1.0 = positive)
      // Pitch: Not directly supported in basic System.Speech, would require SSML
      const rateValue = Math.round((this.rate - 1) * 10); // Convert 0.5-2.0 to -5 to 10
      const clampedRate = Math.max(-10, Math.min(10, rateValue));
      const escapedText = text.replace(/'/g, "''");
      const psCommand = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Rate = ${clampedRate}; $synth.Speak('${escapedText}')`;
      await execAsync(`powershell -Command "${psCommand}"`);
    }
  }

  /**
   * Check if TTS is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export default TTSEngine;
