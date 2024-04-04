import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { createDeepgramConnection } from "./src/deepgram";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

app.get(
  "/",
  upgradeWebSocket((c) => {
    const deepgram = createDeepgramConnection();

    const isDeepgramOpen = () => deepgram.readyState === WebSocket.OPEN;

    return {
      onOpen() {
        console.log("[WSS] Client connected to server.");
      },

      onMessage(message, ws) {
        if (isDeepgramOpen()) {
          const data = message.data as ArrayBuffer;
          deepgram.send(data);
        }
      },

      onClose: () => {
        deepgram.close();
        console.log("[WSS] Connection closed.");
      },
    };
  })
);

Bun.serve({
  fetch: app.fetch,
  websocket,
});
