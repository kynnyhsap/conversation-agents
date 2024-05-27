import qs from "query-string";

export const ELEVEN_LABS_API_URI = "https://api.elevenlabs.io/v1";

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

const model_id = "eleven_multilingual_v2"; // "eleven_turbo_v2";
const optimize_streaming_latency = 4;
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

export async function ttsStream(
  text,
  output_format = "pcm_16000",
  voiceId = DEFAULT_VOICE_ID,
) {
  const params = {
    output_format,
    optimize_streaming_latency,
  };

  const response = await fetch(
    `${ELEVEN_LABS_API_URI}/text-to-speech/${voiceId}/stream?${qs.stringify(params)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Xi-Api-Key": ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({ model_id, text }),
    },
  );

  if (!response.body) {
    throw new Error("Response body is null");
  }

  return response;
}

export async function tts(
  text,
  output_format = "pcm_16000",
  voiceId = DEFAULT_VOICE_ID,
) {
  const params = {
    output_format,
  };

  const response = await fetch(
    `${ELEVEN_LABS_API_URI}/text-to-speech/${voiceId}?${qs.stringify(params)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Xi-Api-Key": ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({ model_id, text }),
    },
  );

  if (!response.body) {
    throw new Error("Response body is null");
  }

  return response;
}
