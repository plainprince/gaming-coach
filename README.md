# Gaming Coach

AI-powered gaming coach that analyzes gameplay screenshots and provides real-time coaching feedback.

## Features

- **Screenshot Capture**: Automatically captures gameplay screenshots at configurable intervals
- **LLM Analysis**: Uses Ollama (local AI) to analyze screenshots and provide coaching feedback
- **Text-to-Speech**: Speaks coaching feedback aloud using Edge TTS or Piper
- **Keylogger**: Records keyboard input for context-aware analysis

## Prerequisites

1. **Bun** - Install from https://bun.sh
2. **Ollama** - Install from https://ollama.ai and start the server
   ```bash
   ollama serve
   # Pull a vision model (optional but recommended for screenshot analysis)
   ollama pull llama3.2-vision
   ```

## Installation

```bash
# Install dependencies
bun install

# Copy environment configuration
cp .env.example .env

# Edit .env with your preferences
```

## Configuration

Edit `.env` to configure:

| Setting | Description | Default |
|---------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama server URL | http://localhost:11434 |
| `OLLAMA_MODEL` | Model to use | llama3.2-vision |
| `SCREENSHOT_INTERVAL` | Capture interval (seconds) | 5 |
| `TTS_PROVIDER` | TTS engine (edge/piper/none) | edge |
| `KEYLOGGER_ENABLED` | Enable keylogging | true |

## Usage

```bash
# Run the application
bun run src/index.ts
```

The application will:
1. Start capturing screenshots at the configured interval
2. Analyze screenshots using Ollama
3. Provide coaching feedback via TTS
4. Log keyboard input for context

## Project Structure

```
gaming-coach/
├── src/
│   ├── index.ts        # Main entry point
│   ├── config.ts       # Configuration loader
│   ├── screenshot.ts   # Screenshot capture
│   ├── llm.ts          # LLM integration
│   ├── tts.ts          # Text-to-speech
│   ├── keylogger.ts    # Keyboard logging
│   └── prompts.ts      # AI prompt templates
├── .env.example        # Environment configuration
├── package.json        # Dependencies
└── tsconfig.json       # TypeScript config
```

## Modes

- `full` - Screenshot capture + analysis + TTS
- `screenshot-only` - Only capture screenshots
- `analysis-only` - Only analyze (no auto-capture)

## Troubleshooting

### Ollama connection refused
Make sure Ollama is running: `ollama serve`

### No screenshots captured
Check that the screenshots directory has proper permissions.

### TTS not working
- On macOS: Uses built-in `say` command as fallback
- For better TTS: Install Piper from https://github.com/rhasspy/piper

## License

MIT