import qs from "query-string";
import { LiveTranscriptionEvent, LiveSchema } from "@deepgram/sdk";

const DEEPGRAM_URL = "wss://api.deepgram.com/v1/listen";

export function createDeepgramConnection() {
  const params: LiveSchema = {
    model: "nova-2",
    language: "en-US",
    smart_format: true,
    channels: 2,
    sample_rate: 44_100,
    encoding: "linear16",
  };

  const headers = {
    Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
  };

  const ws = new WebSocket(`${DEEPGRAM_URL}?${qs.stringify(params)}`, {
    // @ts-ignore
    headers,
  });

  ws.addEventListener("open", async (event) => {
    console.log("[DEEPGRAM 🎥] Connection opened.");

    ws.addEventListener("close", () => {
      console.log("[DEEPGRAM 🎥] Connection closed.");
    });
    ws.addEventListener("error", () => {
      console.error("[DEEPGRAM 🎥] error.");
    });

    // ws.addEventListener("message", async (event) => {
    //   const data = JSON.parse(event.data) as LiveTranscriptionEvent;
    //   onTranscript(data);

    //   console.log(
    //     "[DEEPGRAM 🎥] Transcribed:",
    //     data.channel.alternatives[0].transcript
    //   );
    // });
  });

  return ws;
}
