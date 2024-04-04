import qs from "query-string";

const voiceId = "pNInz6obpgDQGcFmaJgB";
const ELEVEN_LABS_API_URL = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input`;

export function createElevenLabsConnection() {
  const params = {
    model_id: "eleven_multilingual_v2",
    optimize_streaming_latency: 4,
    // output_format: "pcm_16000",
  };

  const ws = new WebSocket(`${ELEVEN_LABS_API_URL}?${qs.stringify(params)}`);

  function sendText(text) {
    console.log("[ELVENLABS] sending text: ", text);

    ws.send(
      JSON.stringify({
        text: text + " ",
        flush: true,
        // try_trigger_generation: true,
      })
    );
  }

  ws.addEventListener("open", async (event) => {
    console.log("[ELVENLABS] Connection opened.");

    ws.addEventListener("close", () => {
      console.log("[ELVENLABS] Collection closed.");
    });
    ws.addEventListener("error", () => {
      console.error("[ELVENLABS] error.");
    });
    // ws.addEventListener("message", async (message) => {
    //   const data = JSON.parse(message.data);
    //   onAudio(data);
    // });

    ws.send(
      JSON.stringify({ text: " ", xi_api_key: process.env.ELEVEN_LABS_API_KEY })
    );
    console.log("[ELVENLABS] tts started...");
  });

  return ws;
}
