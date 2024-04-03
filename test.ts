import { spawn } from "bun";

const URL = "ws://localhost:3000";

const SAMPLE_RATE = 44100;
const CHANNELS = 2;

const command = `ffmpeg -f avfoundation -i :2 -ac ${CHANNELS} -ar ${SAMPLE_RATE} -f wav -`;

const ffmpeg = spawn(command.split(" "), {
  stderr: "ignore", // run quietly
});
const recordingStream = ffmpeg.stdout;

const ws = new WebSocket(URL);

ws.addEventListener("open", async (event) => {
  console.log("[WS] Connected to websocket. Sending live audio...");

  // @ts-ignore
  for await (const chunk of recordingStream) {
    ws.send(chunk);
  }
});

const mpv = spawn(`mpv -`.split(" "), {
  stdin: "pipe",
  // stderr: "ignore", // run quietly
});

ws.addEventListener("message", async (event) => {
  const buf = event.data as Uint8Array;

  mpv.stdin.write(buf);
  mpv.stdin.flush();
});
