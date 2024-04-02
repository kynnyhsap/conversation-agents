import recorder from "node-record-lpcm16";

import { WebSocket } from "ws";

// const URL = "wss://deepgram-ws-production.up.railway.app";
const URL = "ws://localhost:3000";

const ws = new WebSocket(URL);

ws.on("open", function open() {
  console.log("[WS] Connection opened.");

  ws.on("message", function incoming(message) {
    console.log("[WS] Received message:", message);
  });

  const recording = recorder.record({
    channels: 1,
    sampleRate: 16_000,
    audioType: "wav", // Linear PCM
  });

  const recordingStream = recording.stream();

  recordingStream.on("readable", () => {
    const data = recordingStream.read();
    console.log("[WS] Sending data:", data);
    ws.send(data);
  });
});

// const recording = recorder.record({
//   channels: 1,
//   sampleRate: 16_000,
//   audioType: "wav", // Linear PCM
// });

// const recordingStream = recording.stream();

// recordingStream.on("readable", () => {
//   const data = recordingStream.read();
//   connection.send(data);
// });
