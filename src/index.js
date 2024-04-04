import dotenv from "dotenv";
dotenv.config();

import express from "express";
import expressWs from "express-ws";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import OpenAI from "openai";

import { tts } from "./tts.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

expressWs(app);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function chat(text) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: text }],
  });

  return response.choices[0].message.content ?? "";
}

async function ttsStrean(text) {
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB/stream?optimize_streaming_latency=4`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        model_id: "eleven_multilingual_v2",
        text,
      }),
    }
  );
}

app.ws("/", function (ws, req) {
  console.log("[WSS] Client connected to server");
  ws.on("close", () => {
    console.log("[WSS] Client disconnected.");
    endTss();
  });
  ws.on("error", (err) => {
    console.error("[WSS] Client error:", err);
    endTss();
  });

  const {
    isConnectionOpen,
    sendText,
    end: endTss,
  } = tts((data) => {
    if (data && data.audio) {
      const buf = Buffer.from(data.audio, "base64");
      console.log("🎧 Sending audio patch:", data.audio.slice(0, 10) + "...");
      ws.send(buf);
    }
  });

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const deepgramConnection = deepgram.listen.live({
    model: "nova-2",
    language: "en-US",
    smart_format: true,
    channels: 2,
    sample_rate: 44_100,
    encoding: "linear16",
  });

  deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("[DEEPGRAM] Connection opened.");

    deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log(" [DEEPGRAM]Connection closed.");
    });

    deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;

      if (transcript && isConnectionOpen) {
        chat(transcript).then((resp) => {
          console.log("[OPENAI] LLM response:", resp);
          sendText(resp);
        });
      }

      // if (transcript && isConnectionOpen) {
      //   sendText(transcript);
      // }

      console.log("[DEEPGRAM] Transcript:", transcript);
    });

    deepgramConnection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("[DEEPGRAM] Metadata:", data);
    });

    deepgramConnection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error("[DEEPGRAM] Error:", err);
      endTss();
    });

    ws.on("message", function (data) {
      deepgramConnection.send(data);
    });
  });
});

app.listen(port);
