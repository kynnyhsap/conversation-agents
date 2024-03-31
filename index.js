const express = require("express");
const app = express();
const port = Number(process.env.PORT ?? 3000);
const expressWs = require("express-ws")(app);

const dotenv = require("dotenv");
dotenv.config();

const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

const { tts } = require("./experiments/tts");

app.ws("/", function (ws, req) {
  console.log("[WSS] Client connected to server.");
  ws.on("error", console.error);
  ws.on("close", console.info);

  const {
    isConnectionOpen,
    sendText,
    end: endTss,
  } = tts((data) => {
    if (data && data.audio) {
      const buf = Buffer.from(data.audio, "base64");
      console.log(
        "[WSS] Sending audio patch:",
        data.audio.slice(0, 10) + "..."
      );
      ws.send("----", buf);
    }
  });

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const deepgramConnection = deepgram.listen.live({
    model: "nova-2",
    language: "en-US",
    smart_format: true,
    channels: 2,
    encoding: "linear16",
    sample_rate: 44_100,
  });

  deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("[DEEPGRAM] Connection opened.");

    deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log(" [DEEPGRAM]Connection closed.");
    });

    deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;

      // if (transcript) {
      //   chat(transcript).then((resp) => {
      //     console.log("[OPENAI] Chat response:", resp);
      //   });
      // }

      if (transcript && isConnectionOpen) {
        sendText(transcript);
        endTss();
      }

      console.log("[DEEPGRAM] Transcript:", transcript);
      // ws.send(transcript);
    });

    deepgramConnection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("[DEEPGRAM] Metadata:", data);
    });

    deepgramConnection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error("[DEEPGRAM] Error:", err);
    });

    ws.on("message", function (data) {
      deepgramConnection.send(data);
    });
  });
});

app.listen(port);
