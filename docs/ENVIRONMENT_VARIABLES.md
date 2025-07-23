# Environment Variables

This document describes the environment variables used by the application.

## AI Onboarding Features

### OPENAI_API_KEY
- **Purpose**: OpenAI API key for AI-powered onboarding suggestions
- **Required**: No (falls back to mock suggestions)
- **Format**: `sk-proj-...` (OpenAI project API key)
- **Usage**: Used by `/api/ai/[type]` endpoints to generate personalized bio, services, and highlights content

**Example**:
```bash
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
```

**Fallback Behavior**:
When `OPENAI_API_KEY` is not set or invalid:
- API endpoints return fitness-focused mock suggestions
- No API calls are made to OpenAI
- Dev onboarding flow continues to work normally
- Console logs indicate mock mode is active

### OPENAI_MODEL
- **Purpose**: OpenAI model to use for text generation
- **Required**: No (defaults to gpt-3.5-turbo)
- **Options**: gpt-3.5-turbo, gpt-4, gpt-4-turbo-preview
- **Usage**: Controls which OpenAI model is used for generating suggestions

**Example**:
```bash
OPENAI_MODEL=gpt-3.5-turbo
```

## Development Mode

The AI endpoints automatically detect dev mode users:
- User IDs starting with `DEV_` skip database writes
- Mock suggestions are always returned for dev users
- No OpenAI API calls are made for dev users (saves API costs)

## Testing

For testing environments, you can omit the `OPENAI_API_KEY` to ensure:
- Tests run without external API dependencies
- Mock suggestions provide consistent test data
- No API costs are incurred during testing

## Security Notes

- Keep your OpenAI API key secure and never commit it to version control
- Use environment-specific API keys (dev, staging, production)
- Monitor API usage through the OpenAI dashboard
- Consider rate limiting for production environments