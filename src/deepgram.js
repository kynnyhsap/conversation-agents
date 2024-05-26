import qs from "query-string";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

const DEEPGRAM_API_URL = "https://api.deepgram.com/v1";

export function createDeepgramConnection() {
  const params = {
    model: "nova-2",

    language: "en-US",

    // NOTE: audio recorded with web browser is conteinerized, hence we shoudn't specify encoding, sample_rate and channels

    channels: 2,
    sample_rate: 44100,
    encoding: "linear16",

    smart_format: true,
    profanity_filter: false,
  };

  console.log("[DEEPGRAM 🎥] params", params);

  console.time("deepgram connection latency");
  const ws = new WebSocket(
    `${DEEPGRAM_API_URL}/listen?${qs.stringify(params)}`,
    {
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
      },
    },
  );

  ws.addEventListener("open", async (event) => {
    console.timeEnd("deepgram connection latency");

    console.log("[DEEPGRAM 🎥] Connection opened.");

    ws.addEventListener("close", () => {
      console.log("[DEEPGRAM 🎥] Connection closed.");
    });
    ws.addEventListener("error", (e) => {
      console.error("[DEEPGRAM 🎥] error.", e);
    });

    setInterval(() => {
      ws.send(JSON.stringify({ type: "KeepAlive" }));
      // console.log("[DEEPGRAM 🎥] sending keep alive");
    }, 3000);
  });

  return ws;
}

export async function ttsStream(text) {
  const params = {
    model: "aura-asteria-en",
  };

  const response = await fetch(
    `${DEEPGRAM_API_URL}/speak?${qs.stringify(params)}`,
    {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.body) {
    throw new Error("Response body is null");
  }

  return response.body;
}
