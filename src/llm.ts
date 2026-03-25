import { appConfig } from './config.js';
import { readFileSync } from 'fs';
import { createAnalysisPrompt } from './prompts.js';
import { logger } from './logger.js';

/**
 * LLM Integration module using Ollama
 * Simplified for single sentence advice
 */
export class LLMClient {
  private baseUrl: string;
  private model: string;
  private lastAdvice: string = '';
  private lastAnalysisTime: number = 0;
  private Ollama: any = null;

  constructor() {
    this.baseUrl = appConfig.ollama.baseUrl;
    this.model = appConfig.ollama.model;
  }

  /**
   * Initialize the Ollama client
   */
  async initialize(): Promise<void> {
    try {
      const { default: ol } = await import('ollama');
      this.Ollama = ol;
      this.Ollama.config.baseURL = this.baseUrl.replace('/api', '');
      
      logger.info(`[LLM] Initialized with model: ${this.model} at ${this.baseUrl}`);
      
      // Test connection
      try {
        const tags = await this.Ollama.list();
        logger.info(`[LLM] Connected to Ollama, available models: ${tags.models?.map((m: any) => m.name).join(', ') || 'none'}`);
      } catch (e) {
        logger.warn('[LLM] Could not list models');
      }
    } catch (error) {
      logger.warn('[LLM] Ollama package not available, using HTTP fallback');
      this.Ollama = null;
    }
  }

  /**
   * Get last advice
   */
  getLastAdvice(): string {
    return this.lastAdvice;
  }

  /**
 * Analyze a screenshot and return a single sentence of advice
 */
  async analyze(screenshotPath: string): Promise<string | null> {
    try {
      const prompt = createAnalysisPrompt();
      const imageData = readFileSync(screenshotPath);
      const base64Image = imageData.toString('base64');

      const response = await this.chatWithOllama(prompt, base64Image);
      
      // Clean up the response - remove special characters
      const cleaned = this.cleanResponse(response);
      this.lastAdvice = cleaned;
      this.lastAnalysisTime = Date.now();

      logger.info(`[LLM] Advice: ${cleaned}`);
      return cleaned;
    } catch (error) {
      logger.error('[LLM] Analysis failed:', error as Error);
      return null;
    }
  }

  /**
   * Clean response for TTS - remove special characters
   */
  private cleanResponse(text: string): string {
    // Remove asterisks, dashes, and other special chars
    return text
      .replace(/[*#\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200); // Limit length for TTS
  }

  /**
   * Chat with Ollama
   */
  private async chatWithOllama(prompt: string, imageBase64?: string): Promise<string> {
    if (this.Ollama) {
      try {
        const messages: any[] = [];
        
        if (imageBase64) {
          messages.push({
            role: 'user',
            content: prompt,
            images: [imageBase64]
          });
        } else {
          messages.push({ role: 'user', content: prompt });
        }

        const response = await this.Ollama.chat({
          model: this.model,
          messages,
          stream: false
        });

        return response.message?.content || '';
      } catch (e) {
        logger.warn('[LLM] Ollama package failed');
      }
    }

    // HTTP fallback
    return this.chatViaHttp(prompt, imageBase64);
  }

  /**
   * HTTP fallback for Ollama API
   */
  private async chatViaHttp(prompt: string, imageBase64?: string): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    
    const body: any = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    };

    if (imageBase64) {
      body.messages[0].images = [imageBase64];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

     const data = await response.json() as { message?: { content: string } };
     return data.message?.content || '';
  }

  isReady(): boolean {
    return true;
  }
}

export default LLMClient;
