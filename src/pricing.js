// Deepgram (nova-2)
const TRANSCRIPTION_COST_PER_MS = 0.0059 / 60 / 1000; // 0.0059$ per minute

// OpenAI (gpt-3.5-turbo)

const LLM_INPUT_COST_PER_CHAR = 0.5 / 1_000_000 / 4; // 0.5$ tokens per 1M tokens, 1 token ~= 4 chars
const LLM_OUTPUT_COST_PER_CHAR = 1.5 / 1_000_000 / 4; // 0.5$ tokens per 1M tokens, 1 token ~= 4 chars

// ElevenLabs
const TTS_COST_PER_CHAR = 0.18 / 1000; // 0.18$ per 1000 chars

export function getTranscriptionCost(durationMs) {
  return durationMs * TRANSCRIPTION_COST_PER_MS;
}

export function getLLMCost(prompt, response) {
  return (
    prompt.length * LLM_INPUT_COST_PER_CHAR +
    response.length * LLM_OUTPUT_COST_PER_CHAR
  );
}

export function getTTSCost(text) {
  return text.length * TTS_COST_PER_CHAR;
}
