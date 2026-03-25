import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logFactory } from 'pretty-js-log';

/**
 * Custom logging library with timestamp-based log files and colored console output
 */
export class Logger {
  private logDir: string;
  private logFile: string;
  private prettyLogger: ReturnType<typeof logFactory>;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    
    // Ensure log directory exists
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
    
    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = join(this.logDir, `${timestamp}.log`);
    
    // Initialize pretty-js-log for colored console output
    this.prettyLogger = logFactory({ file: this.logFile });
  }

  /**
   * Get current timestamp for log file
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Log a message with timestamp
   */
  log(message: string): void {
    const timestamp = this.getTimestamp();
    const logEntry = `[${timestamp}] ${message}\n`;
    appendFileSync(this.logFile, logEntry);
    this.prettyLogger.log(message);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error): void {
    const timestamp = this.getTimestamp();
    let logEntry = `[${timestamp}] ERROR: ${message}\n`;
    if (error) {
      logEntry += `[${timestamp}] ${error.stack || error.message}\n`;
    }
    appendFileSync(this.logFile, logEntry);
    this.prettyLogger.error(message);
    if (error) {
      this.prettyLogger.error(error.stack || error.message);
    }
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    const timestamp = this.getTimestamp();
    const logEntry = `[${timestamp}] INFO: ${message}\n`;
    appendFileSync(this.logFile, logEntry);
    this.prettyLogger.info(message);
  }

  /**
   * Log a debug message
   */
  debug(message: string): void {
    const timestamp = this.getTimestamp();
    const logEntry = `[${timestamp}] DEBUG: ${message}\n`;
    appendFileSync(this.logFile, logEntry);
    this.prettyLogger.debug(message);
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    const timestamp = this.getTimestamp();
    const logEntry = `[${timestamp}] SUCCESS: ${message}\n`;
    appendFileSync(this.logFile, logEntry);
    this.prettyLogger.info(message);
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    const timestamp = this.getTimestamp();
    const logEntry = `[${timestamp}] WARN: ${message}\n`;
    appendFileSync(this.logFile, logEntry);
    this.prettyLogger.warn(message);
  }

  /**
   * Get the current log file path
   */
  getLogFile(): string {
    return this.logFile;
  }
}

// Export a default logger instance
export const logger = new Logger();

export default Logger;
