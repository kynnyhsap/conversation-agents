import qs from "query-string";

const voiceId = "5x4OabTaxKEADQiUryOC";
const ELEVEN_LABS_API_URL = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input`;

export function createElevenLabsConnection({
  output_format,
}: {
  output_format?: string | undefined;
}) {
  const params = {
    model_id: "eleven_multilingual_v2",
    optimize_streaming_latency: 4,
    output_format: output_format ?? "pcm_16000",
  };

  const ws = new WebSocket(`${ELEVEN_LABS_API_URL}?${qs.stringify(params)}`);

  ws.addEventListener("open", async (event) => {
    console.log("[ELVENLABS] Connection opened.");

    ws.addEventListener("close", () => {
      console.log("[ELVENLABS] Collection closed.");
    });
    ws.addEventListener("error", () => {
      console.error("[ELVENLABS] error.");
    });

    ws.send(
      JSON.stringify({
        text: " ",
        xi_api_key: process.env.ELEVEN_LABS_API_KEY,
      })
    );
    console.log("[ELVENLABS] tts started...");
  });

  return ws;
}
