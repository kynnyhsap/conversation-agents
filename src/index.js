import { isJSON } from "./utils.js";
import { createDeepgramConnection } from "./deepgram.js";
import { ttsStream } from "./elevenlabs.js";
import { chat } from "./openai.js";
import { getLLMCost, getTTSCost, getTranscriptionCost } from "./pricing.js";
import prettyms from "pretty-ms";
import fs from "fs";
import url from "url";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

import { WebSocketServer } from "ws";

const chatHistory = [];
const deepgramMessages = [];
const inputAudioChunks = [];
const outputAudioChunks = [];

const SILENCE_CHUNK = Buffer.alloc(44100 * 3 * 2); // size = sampleRate * durationInSeconds * bytesPerSample

const wss = new WebSocketServer({ port: Number(process.env.PORT ?? 3000) });

wss.on("connection", (ws, req) => {
  const { query } = url.parse(req.url, true);

  const output_format = query.output_format ?? "pcm_16000";
  const language = query.language ?? "en";

  console.log("[WSS] Client connected to server.", { output_format, language });

  const startTimestamp = Date.now();

  const deepgram = createDeepgramConnection({ language });
  const isDeepgramOpen = () => deepgram.readyState === WebSocket.OPEN;

  const currentTranscripts = [];

  let transcribing = false;

  async function onStart() {
    transcribing = true;
  }

  async function onStop() {
    transcribing = false;

    deepgram.send(SILENCE_CHUNK); // send silence chunk to force the finish of transcription
    await sleep(500); // sleep for some time to allow deepgram send us the last chunk

    const prompt = currentTranscripts.join(" ").trim();
    currentTranscripts.length = 0; // clear the array

    if (!prompt) return;

    console.log("[LLM prompt]:", prompt);

    console.time("[LLM latency]");
    const message = await chat(prompt, chatHistory);
    chatHistory.push({ prompt, message });
    console.timeEnd("[LLM latency]");

    console.log("[LLM response]:", message.content);

    let firstChunkLoaded = false;
    console.time("[TTS latency]");
    const ttsResponse = await ttsStream(message.content, output_format);
    for await (const chunk of ttsResponse.body) {
      if (!firstChunkLoaded) {
        firstChunkLoaded = true;
        console.timeEnd("[TTS latency]");
      }

      ws.send(chunk);
    }
  }

  deepgram.addEventListener("message", async (messageEvent) => {
    const data = JSON.parse(messageEvent.data);
    // console.log("[DEEPGRAM] Message received.", data);

    deepgramMessages.push(data);

    if (data.type === "Results") {
      const transcript = data.channel.alternatives[0].transcript;
      if (!transcript) return;
      console.log("[DEEPGRAM 🎥] T:", transcript);
      currentTranscripts.push(transcript);
    }
  });

  ws.on("message", async (message) => {
    if (isJSON(message.toString())) {
      const { type } = JSON.parse(message.toString());

      if (type === "start") {
        await onStart();
        return;
      }

      if (type === "stop") {
        await onStop();
        return;
      }
    }

    if (transcribing) {
      // process.stdout.write("🎤");
      inputAudioChunks.push(message);

      if (!isDeepgramOpen()) return;

      deepgram.send(message);
    }
  });

  ws.on("close", () => {
    deepgram.close();

    if (process.env.NODE_ENV === "production") {
      console.log("[WSS] Connection closed.");
      return;
    }

    const endTimestamp = Date.now();
    const duration = endTimestamp - startTimestamp;

    console.log("[DEEPGRAM 🎥] Duration:", prettyms(duration));

    const tmpFolder = `./tmp/${startTimestamp}`;

    if (!fs.existsSync(tmpFolder)) {
      fs.mkdirSync(tmpFolder);
    }

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
