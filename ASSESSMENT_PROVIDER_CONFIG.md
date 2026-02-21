# Assessment Provider Configuration

## Overview
The assessment question generation system now supports multiple AI providers. You can switch between providers using environment variables without changing code.

## Environment Variables

### Required Variables
```bash
# Choose your provider
BASIC_ASSESSMENT_PROVIDER=together    # or 'gemini'

# Specify the model for your provider
BASIC_ASSESSMENT_MODEL=meta-llama/Llama-3-70b-chat-hf
```

### Provider Options

#### Together AI (Default)
```bash
BASIC_ASSESSMENT_PROVIDER=together
BASIC_ASSESSMENT_MODEL=meta-llama/Llama-3-70b-chat-hf
TOGETHER_API_KEY=your_api_key_here
```

#### Google Gemini
```bash
BASIC_ASSESSMENT_PROVIDER=gemini
BASIC_ASSESSMENT_MODEL=gemini-1.5-flash
GEMINI_API_KEY=your_api_key_here
```

## Supported Providers

| Provider | Environment Variable | Supported Models |
|----------|---------------------|------------------|
| Together AI | `together` | `meta-llama/Llama-3-70b-chat-hf`, `meta-llama/Llama-3-8b-chat-hf`, etc. |
| Google Gemini | `gemini` or `google` | `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-pro`, etc. |

## Installation Requirements

### For Gemini Support
```bash
npm install @google/generative-ai
```

### For Together AI
```bash
npm install openai  # Already installed
```

## Switching Providers

1. **Update your `.env` file:**
   ```bash
   # Switch to Gemini
   BASIC_ASSESSMENT_PROVIDER=gemini
   BASIC_ASSESSMENT_MODEL=gemini-1.5-flash
   GEMINI_API_KEY=your_gemini_key
   ```

2. **Restart your backend server**

3. **Test the assessment generation**

## Error Handling

- **Missing API Key**: `TOGETHER_API_KEY is not configured` or `GEMINI_API_KEY is not configured`
- **Unsupported Provider**: `Unsupported assessment provider: [provider]`
- **Model Issues**: Check model names are correct for the chosen provider

## Performance Notes

- **Together AI**: Generally faster response times, good for high-volume generation
- **Gemini**: May have different response patterns, test for consistency
- **Latency Tracking**: Both providers track generation time in `generationMeta.latencyMs`

## Backward Compatibility

The system maintains backward compatibility:
- Default provider: `together`
- Default model: `meta-llama/Llama-3-70b-chat-hf`
- Existing `TOGETHER_API_KEY` and `TOGETHER_MODEL` still work if `BASIC_ASSESSMENT_*` variables are not set</contents>
