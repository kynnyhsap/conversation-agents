import { WebSocket } from "ws";
import qs from "query-string";

// const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const voiceId = "pNInz6obpgDQGcFmaJgB";

const endpoint = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?${qs.stringify(
  {
    model_id: "eleven_multilingual_v2",
    optimize_streaming_latency: 4,
    // output_format: "pcm_16000",
  }
)}`;

export function tts(handle) {
  let isOpen = false;

  const socket = new WebSocket(endpoint);

  socket.on("error", console.error);
  socket.on("close", console.info);

  function send(data) {
    console.log("[ELVENLABS] send", JSON.stringify(data));
    socket.send(JSON.stringify(data));
  }

  function start() {
    send({ text: " ", xi_api_key: process.env.ELEVEN_LABS_API_KEY });
  }

  function end() {
    send({ text: "" });
  }

  function sendText(text) {
    send({
      text: text + " ",
      // flush: true,
      // try_trigger_generation: true,
    });
  }

  socket.on("open", async (event) => {
    console.log("[ELVENLABS] ws open");
    start();

    isOpen = true;

    // await wait(2000);
    // sendText("Hello, world!");
    // await wait(2000);
    // end();
  });

  socket.on("message", async (event) => {
    const response = JSON.parse(Buffer.from(event).toString());
    // console.log("[ELVENLABS] response", response);

    handle(response);
  });

  return {
    isConnectionOpen: () => isOpen,
    sendText,
    end,
  };
}
