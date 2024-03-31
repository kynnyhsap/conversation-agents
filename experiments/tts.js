const dotenv = require("dotenv");
dotenv.config();

const { WebSocket } = require("ws");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const voiceId = "pNInz6obpgDQGcFmaJgB";
const model = "eleven_multilingual_v2";

const outputFormat = "pcm_16000";

const endpoint = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}&output_format=${outputFormat}&optimize_streaming_latency=4`;

module.exports.tts = function ttsWs(handle) {
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
      try_trigger_generation: true,
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
};

// async function live(text, handleResponse) {
//   while (socket.readyState !== WebSocket.OPEN) {
//     console.log("Waiting for connection to open...");
//     await wait(100);
//   }

//   //   while (socket.readyState !== WebSocket.CLOSED) {
//   //     await wait(100);
//   //   }
// }

// live();
