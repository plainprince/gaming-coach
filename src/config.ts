import { config } from 'dotenv';
import { logger } from './logger.js';

// Load environment variables
config();

/**
 * Application configuration interface - simplified
 */
export interface AppConfig {
  ollama: {
    baseUrl: string;
    model: string;
    timeout: number;
  };
  
  screenshot: {
    enabled: boolean;
    quality: number;
    dir: string;
    width: number;
    height: number;
    preset: string;
    scale: number;
  };
  
  tts: {
    enabled: boolean;
    /** TTS provider: 'auto' uses platform-specific TTS (say on macOS, espeak on Linux, PowerShell on Windows), 'none' disables TTS */
    provider: 'auto' | 'none';
    piperPath: string;
    edgeVoice: string;
    /** Speech rate (0.5 = half speed, 1.0 = normal, 2.0 = double speed) */
    rate: number;
    /** Voice pitch adjustment (-10 to 10 for Windows, -10 to 10 for macOS say, 0-99 for espeak) */
    pitch: number;
    volume: number;
  };
  
  display: {
    window: {
      enabled: boolean;
      position: string; // Accepts predefined keywords (top-left, center) or 'X%,Y%' for custom placement
      transparency: number;
      duration: number;
      noFocus: boolean;
      persistDuringTts: boolean;
    };
  };
  
  app: {
    startupDelay: number;
    rate: number;
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AppConfig {
  const config: AppConfig = {
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'qwen3.5:cloud',
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10),
    },
    screenshot: {
      enabled: process.env.SCREENSHOT_ENABLED !== 'false',
      quality: parseInt(process.env.SCREENSHOT_QUALITY || '80', 10),
      dir: process.env.SCREENSHOT_DIR || './screenshots',
      width: parseInt(process.env.SCREENSHOT_WIDTH || '960', 10),
      height: parseInt(process.env.SCREENSHOT_HEIGHT || '540', 10),
      preset: process.env.SCREENSHOT_PRESET || '960p',
      scale: parseFloat(process.env.SCREENSHOT_SCALE || '1.0'),
    },
    tts: {
      enabled: process.env.TTS_ENABLED !== 'false',
      provider: (process.env.TTS_PROVIDER as 'auto' | 'none') || 'auto',
      piperPath: process.env.PIPER_PATH || './piper/piper',
      edgeVoice: process.env.EDGE_TTS_VOICE || 'en-US-AriaNeural',
      dir: process.env.TTS_DIR || './audio',
      rate: parseFloat(process.env.TTS_RATE || '1.0'),
      pitch: parseFloat(process.env.TTS_PITCH || '0'),
      volume: parseFloat(process.env.TTS_VOLUME || '1.0'),
    },
    display: {
      window: {
        enabled: process.env.DISPLAY_WINDOW_ENABLED !== 'false',
        position: process.env.DISPLAY_WINDOW_POSITION || '50%,50%', // Default to center
        transparency: parseFloat(process.env.DISPLAY_WINDOW_TRANSPARENCY || '0.8'),
        duration: parseInt(process.env.DISPLAY_WINDOW_DURATION || '5', 10),
        noFocus: process.env.DISPLAY_WINDOW_NO_FOCUS !== 'false',
        persistDuringTts: process.env.DISPLAY_WINDOW_PERSIST_DURING_TTS === 'true',
      },
    },
    app: {
      startupDelay: parseInt(process.env.STARTUP_DELAY || '3', 10),
      rate: parseInt(process.env.RATE || '30', 10),
    },
  };

  return config;
}

/**
 * Get the global configuration instance
 */
export const appConfig = loadConfig();

/**
 * Validate that required directories exist
 */
export function ensureDirectories(): void {
  // No directories to create since audio output is not used
}

export default appConfig;
