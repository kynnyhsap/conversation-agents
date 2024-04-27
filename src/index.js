import { createDeepgramConnection } from "./deepgram.js";
import { createElevenLabsConnection } from "./elevenlabs.js";
import { chat } from "./openai.js";
import { getLLMCost, getTTSCost, getTranscriptionCost } from "./pricing.js";
import prettyms from "pretty-ms";
import fs from "fs";
import url from "url";

import WebSocket, { WebSocketServer } from "ws";

const deepgramMessages = [];
const chatHistory = [];
const inputAudioChunks = [];
const outputAudioChunks = [];

const wss = new WebSocketServer({ port: Number(process.env.PORT ?? 3000) });

wss.on("connection", (ws, req) => {
  const { output_format } = url.parse(req.url, true).query;

  console.log("[WSS] Client connected to server.", { output_format });

  const startTimestamp = Date.now();

  const deepgram = createDeepgramConnection();

  const elevenlabs = createElevenLabsConnection({
    output_format: output_format ?? "pcm_16000",
  });

  const isDeepgramOpen = () => deepgram.readyState === WebSocket.OPEN;
  const isElevenLabsOpen = () => elevenlabs.readyState === WebSocket.OPEN;

  deepgram.addEventListener("message", async (messageEvent) => {
    const data = JSON.parse(messageEvent.data);

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
      }),
    );
  });

  elevenlabs.addEventListener("message", (messageEvent) => {
    const data = JSON.parse(messageEvent.data);

    if (data.audio) {
      console.log(
        "[ELEVENLABS] Recieved audio chunk:",
        data.audio.slice(0, 15) + "...",
      );

      const buf = Buffer.from(data.audio, "base64");

      outputAudioChunks.push(buf);

      ws.send(buf);
    }
  });

  ws.on("message", (message) => {
    inputAudioChunks.push(message);

    if (isDeepgramOpen()) {
      deepgram.send(message);
    }
  });

  // ws.on("pong", heartbeat);
  ws.on("close", () => {
    deepgram.close();

    const endTimestamp = Date.now();
    const duration = endTimestamp - startTimestamp;

    console.log("[DEEPGRAM 🎥] Duration:", prettyms(duration));

    elevenlabs.close();

    const tmpFolder = `./tmp/${startTimestamp}`;

    if (!fs.existsSync(tmpFolder)) {
      fs.mkdirSync(tmpFolder);
    }

    // TODO: save audio chunks

    fs.writeFileSync(
      `${tmpFolder}/output.mp3`,
      Buffer.concat(outputAudioChunks),
    );
    fs.writeFileSync(`${tmpFolder}/input.mp3`, Buffer.concat(inputAudioChunks));

    const saveJson = (filename, data) =>
      fs.writeFileSync(
        `${tmpFolder}/${filename}.json`,
        JSON.stringify(data, null, 2),
      );

    saveJson("deepgram-messages", deepgramMessages);
    saveJson("chat-history", chatHistory);

    const metadata = {
      duration: prettyms(duration),
      startDate: new Date(startTimestamp),
      endDate: new Date(endTimestamp),

      durationMs: duration,
      startTimestamp,
      endTimestamp,
    };

    saveJson("metadata", metadata);

    const transcriptionCost = getTranscriptionCost(duration);
    const llmCost = chatHistory.reduce(
      (a, { prompt, message }) => a + getLLMCost(prompt, message.content ?? ""),
      0,
    );
    const ttsCost = chatHistory.reduce(
      (a, { message }) => a + getTTSCost(message.content ?? ""),
      0,
    );

    const totalCost = transcriptionCost + llmCost + ttsCost;

    const cost = {
      transcription: transcriptionCost,
      llm: llmCost,
      tts: ttsCost,

      total: totalCost,
      totalPretty: "$" + totalCost.toFixed(3),
    };

    saveJson("cost", cost);

    console.log("[WSS] Connection closed.");
  });
});
