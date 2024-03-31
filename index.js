// const { createServer } = require("http");
const { createServer } = require("https");

const dotenv = require("dotenv");
dotenv.config();

const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

const { WebSocketServer } = require("ws");
const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", function connection(ws) {
  console.log("[WSS] Client connected to server.");
  ws.on("error", console.error);
  ws.on("close", console.info);

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const deepgramConnection = deepgram.listen.live({
    model: "nova-2",
    language: "en-US",
    smart_format: true,
    channels: 1,
    encoding: "linear16",
    sample_rate: 16_000,
  });

  deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("[DEEPGRAM] Connection opened.");

    deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log(" [DEEPGRAM]Connection closed.");
    });

    deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;

      console.log("[DEEPGRAM] Transcript:", transcript);
      ws.send(transcript);
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

server.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
