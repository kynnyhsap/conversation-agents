const recorder = require("node-record-lpcm16");

const { WebSocket } = require("ws");
const ws = new WebSocket("ws://localhost:8081");

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
