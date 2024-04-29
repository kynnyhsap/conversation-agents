import { createDeepgramConnection } from "./deepgram.js";
import { ttsStream } from "./elevenlabs.js";
// import { chat } from "./groq.js";
import { chat, chatStream } from "./openai.js";
import { getLLMCost, getTTSCost, getTranscriptionCost } from "./pricing.js";
import prettyms from "pretty-ms";
import fs from "fs";
import url from "url";

import { WebSocketServer } from "ws";

const chatHistory = [];
const deepgramMessages = [];
const inputAudioChunks = [];
const outputAudioChunks = [];

const wss = new WebSocketServer({ port: Number(process.env.PORT ?? 3000) });

wss.on("connection", (ws, req) => {
  const { output_format } = url.parse(req.url, true).query;

  console.log("[WSS] Client connected to server.", { output_format });

  const startTimestamp = Date.now();

  const deepgram = createDeepgramConnection();
  const isDeepgramOpen = () => deepgram.readyState === WebSocket.OPEN;

  const currentTranscripts = [];

  deepgram.addEventListener("message", async (messageEvent) => {
    const data = JSON.parse(messageEvent.data);

    deepgramMessages.push(data);

    if (data.type === "Results") {
      const transcript = data.channel.alternatives[0].transcript;

      if (!transcript) {
        return; // we don't care about empty transcripts
      }

      if (!data.is_final) {
        return; // we don't care about non-final results
      }

      currentTranscripts.push(transcript);
    }

    if (data.type === "UtteranceEnd") {
      const prompt = currentTranscripts.join(" ");
      currentTranscripts.length = 0; // clear the array

      if (!prompt) {
        return;
      }

      console.log("[DEEPGRAM 🎥] T:", prompt);

      console.time("llm response time");
      const message = await chat(prompt, chatHistory);
      chatHistory.push({ prompt, message });
      console.timeEnd("llm response time");

      const speechStream = await ttsStream(message.content, output_format);

      for await (const chunk of speechStream) {
        ws.send(chunk);
      }

      // const stream = await chatStream(prompt, chatHistory);
      // let response = "";
      // for await (const chunk of stream) {
      //   const content = chunk.choices[0]?.delta?.content ?? "";
      //   response += content;
      //   process.stdout.write(content);
      // }
      // console.log("[LLM] ", message.content);

      // TODO
    }
  });

  ws.on("message", (message) => {
    inputAudioChunks.push(message);

    if (!isDeepgramOpen()) {
      return;
    }

    deepgram.send(message);
  });

  ws.on("close", () => {
    deepgram.close();

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
