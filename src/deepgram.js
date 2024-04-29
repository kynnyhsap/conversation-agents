import qs from "query-string";

const DEEPGRAM_URL = "wss://api.deepgram.com/v1/listen";

export function createDeepgramConnection() {
  const params = {
    model: "nova-2",

    language: "en-US",

    // NOTE: audio recorded with web browser is conteinerized, hence we shoudn't specify encoding, sample_rate and channels

    channels: 2,
    sample_rate: 44100,
    encoding: "linear16",

    smart_format: true,
    utterance_end_ms: 1000,
    interim_results: true,
    diarize: true,
    profanity_filter: false,
  };

  console.log("[DEEPGRAM 🎥] params", params);

  console.time("deepgram connection latency");
  const ws = new WebSocket(`${DEEPGRAM_URL}?${qs.stringify(params)}`, {
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
    },
  });

  ws.addEventListener("open", async (event) => {
    console.timeEnd("deepgram connection latency");

    console.log("[DEEPGRAM 🎥] Connection opened.");

    ws.addEventListener("close", () => {
      console.log("[DEEPGRAM 🎥] Connection closed.");
    });
    ws.addEventListener("error", (e) => {
      console.error("[DEEPGRAM 🎥] error.", e);
    });

    // setInterval(() => {
    //   ws.send(JSON.stringify({ type: "KeepAlive" }));
    //   console.log("[DEEPGRAM 🎥] sending keep alive");
    // }, 3000);
  });

  return ws;
}
