import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";

import { createDeepgramConnection } from "./deepgram";
import { createElevenLabsConnection } from "./elevenlabs";
import { chat } from "./openai";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

app.get(
  "/",
  upgradeWebSocket((c) => {
    const output_format = c.req.query("output_format") ?? "pcm_16000";

    const deepgram = createDeepgramConnection();
    const elevenlabs = createElevenLabsConnection({ output_format });

    const isDeepgramOpen = () => deepgram.readyState === WebSocket.OPEN;
    const isElevenLabsOpen = () => elevenlabs.readyState === WebSocket.OPEN;

    return {
      onOpen(event, ws) {
        console.log("[WSS] Client connected to server.");

        deepgram.addEventListener("message", (event) => {
          const data = JSON.parse(event.data);

          const transcript = data.channel.alternatives[0].transcript;

          console.log("[DEEPGRAM 🎥] Transcribed:", transcript);

          if (transcript && isElevenLabsOpen()) {
            chat(transcript).then((resp) => {
              console.log("[OPENAI] LLM response:", resp);

              console.log("[ELVENLABS] sending text", resp);
              elevenlabs.send(
                JSON.stringify({
                  text: resp + " ",
                  flush: true,
                })
              );
            });
          }
        });

        elevenlabs.addEventListener("message", (event) => {
          const data = JSON.parse(event.data);

          if (data.audio) {
            console.log(
              "[ELEVENLABS] Recieved audio chunk:",
              data.audio.slice(0, 15) + "..."
            );

            const buf = Buffer.from(data.audio, "base64");

            console.log("[WSS] Sending audio chunk to client...");
            ws.send(buf);
          }
        });
      },

      onMessage(message, ws) {
        if (isDeepgramOpen()) {
          const data = message.data as ArrayBuffer;
          deepgram.send(data);
        }
      },

      onClose: () => {
        deepgram.close();
        elevenlabs.close();
        console.log("[WSS] Connection closed.");
      },
    };
  })
);

Bun.serve({
  fetch: app.fetch,
  websocket,
});
