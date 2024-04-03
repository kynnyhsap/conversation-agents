import queryString from "query-string";

let deepgramSocket: WebSocket;

let delay = false;

const params = {
  model: "nova-2",
  language: "en-US",
  smart_format: true,
  channels: 2,
  sample_rate: 44_100,
  encoding: "linear16",
};

Bun.serve({
  port: 3000,

  websocket: {
    async open(ws) {
      console.log("[WSS] Client connected to server.");

      deepgramSocket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${queryString.stringify(params)}`,
        {
          // @ts-ignore
          headers: {
            Authorization: `token ${process.env.DEEPGRAM_API_KEY}`,
          },
        }
      );

      deepgramSocket.addEventListener("open", async (event) => {
        console.log("[DEEPGRAM] Connection opened.");

        deepgramSocket.addEventListener("close", () => {
          console.log("[DEEPGRAM]Connection closed.");
        });

        deepgramSocket.addEventListener("message", async (event) => {
          const data = JSON.parse(event.data);

          console.log(
            "[DEEPGRAM] Transcript:",
            data.channel.alternatives[0].transcript
          );

          //   console.log(
          //     "[DEEPGRAM] Transcript:",
          //     data.channel.alternatives[0].transcript
          //   );
        });
      });

      // NOTE: this is a hack to make artifical delay, without it deepgramSocket.send() fails
      Bun.sleep(1000).then(() => {
        delay = true;
      });
    },

    message(ws, message) {
      if (deepgramSocket && delay) {
        const buff = Buffer.from(message);
        deepgramSocket.send(buff);
      }
    },

    close(ws, code, message) {},

    drain(ws) {}, // the socket is ready to receive more data
  },

  fetch(req, server) {
    // upgrade the request to a WebSocket
    if (server.upgrade(req)) {
      return; // do not return a Response
    }
    return new Response("Upgrade failed :(", { status: 500 });
  },
});
