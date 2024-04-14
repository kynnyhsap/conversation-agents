import { Hono } from "hono";
import { createBunWebSocket, serveStatic } from "hono/bun";

import { createDeepgramConnection } from "./deepgram";
import { createElevenLabsConnection } from "./elevenlabs";
import { ChatHisotryItem, chat } from "./openai";
import { LiveTranscriptionEvent } from "@deepgram/sdk";
import { getLLMCost, getTTSCost, getTranscriptionCost } from "./pricing";
import prettyms from "pretty-ms";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

const chatHistory: ChatHisotryItem[] = [];

const deepgramMessages: any[] = [];

app.use("/static/*", serveStatic({ root: "./" }));

app.get(
  "/",
  upgradeWebSocket((c) => {
    const output_format = c.req.query("output_format") ?? "pcm_16000";

    const deepgram = createDeepgramConnection();
    const elevenlabs = createElevenLabsConnection({ output_format });

    const isDeepgramOpen = () => deepgram.readyState === WebSocket.OPEN;
    const isElevenLabsOpen = () => elevenlabs.readyState === WebSocket.OPEN;

    let startTimestamp = 0;

    const chunks: Buffer[] = [];

    return {
      onOpen(event, ws) {
        console.log("[WSS] Client connected to server.");

        deepgram.addEventListener("message", async (event) => {
          const data = JSON.parse(event.data) as LiveTranscriptionEvent;

          deepgramMessages.push(data);

          if (data.type !== "Results") {
            return;
          }

          if (!data.is_final) {
            return; // we don't care about interim results
          }

          const transcript = data.channel.alternatives[0].transcript;

          if (!transcript) {
            return; // we don't care about empty transcripts
          }

          if (!isElevenLabsOpen()) {
            return; // we can't send anything to elevenlabs if we're not connected yet
          }

          console.log("[DEEPGRAM 🎥] T:", transcript);

          const message = await chat(transcript, chatHistory);

          chatHistory.push({
            prompt: transcript,
            message,
          });

          console.log("[OPENAI] LLM response:", message.content);

          // console.log("[ELVENLABS] sending text", resp);
          elevenlabs.send(
            JSON.stringify({
              text: message.content + " ",
              flush: true,
            })
          );
        });

        elevenlabs.addEventListener("message", (event) => {
          const data = JSON.parse(event.data);

          if (data.audio) {
            console.log(
              "[ELEVENLABS] Recieved audio chunk:",
              data.audio.slice(0, 15) + "..."
            );

            const buf = Buffer.from(data.audio, "base64");

            chunks.push(buf);

            ws.send(buf);
          }
        });
      },

      onMessage(message, ws) {
        if (isDeepgramOpen()) {
          if (!startTimestamp) {
            startTimestamp = Date.now();
          }

          const data = message.data as ArrayBuffer;
          deepgram.send(data);
        }
      },

      onClose: async () => {
        deepgram.close();

        const endTimestamp = Date.now();
        const duration = endTimestamp - startTimestamp;
        console.log("[DEEPGRAM 🎥] Duration:", prettyms(duration));

        elevenlabs.close();

        const tmpFolder = `./tmp/${startTimestamp}`;

        if (chunks.length > 0) {
          await Bun.write(
            `${tmpFolder}/audio.mp3`,
            new Blob(chunks, { type: "audio/mp3" })
          ).catch(console.error);
        }

        await Bun.write(
          `${tmpFolder}/deepgram.json`,
          JSON.stringify(deepgramMessages, null, 2)
        );
        await Bun.write(
          `${tmpFolder}/chat-history.json`,
          JSON.stringify(chatHistory, null, 2)
        );

        const metadata = {
          duration: prettyms(duration),
          startDate: new Date(startTimestamp),
          endDate: new Date(endTimestamp),

          durationMs: duration,
          startTimestamp,
          endTimestamp,
        };

        await Bun.write(
          `${tmpFolder}/metadata.json`,
          JSON.stringify(metadata, null, 2)
        );

        const transcriptionCost = getTranscriptionCost(duration);
        const llmCost = chatHistory.reduce(
          (a, { prompt, message }) =>
            a + getLLMCost(prompt, message.content ?? ""),
          0
        );
        const ttsCost = chatHistory.reduce(
          (a, { message }) => a + getTTSCost(message.content ?? ""),
          0
        );

        const totalCost = transcriptionCost + llmCost + ttsCost;

        const cost = {
          transcription: transcriptionCost,
          llm: llmCost,
          tts: ttsCost,

          total: totalCost,
          totalPretty: "$" + totalCost.toFixed(3),
        };

        await Bun.write(
          `${tmpFolder}/cost.json`,
          JSON.stringify(cost, null, 2)
        );

        console.log("[WSS] Connection closed.");
      },
    };
  })
);

Bun.serve({
  fetch: app.fetch,
  websocket,
});
