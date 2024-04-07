import { spawn } from "bun";

const URL = "ws://localhost:3000?output_format=mp3_44100";

const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const AUDIO_DEVICE_INDEX = 1; // ffmpeg -f avfoundation -list_devices true -i ""

const command = `ffmpeg -f avfoundation -i :${AUDIO_DEVICE_INDEX} -ac ${CHANNELS} -ar ${SAMPLE_RATE} -f wav -`;

const ffmpeg = spawn(command.split(" "), {
  stderr: "ignore", // run quietly
});
const recordingStream = ffmpeg.stdout;

const ws = new WebSocket(URL);

ws.addEventListener("open", async (event) => {
  console.log("[Simulated WS] Connected to websocket. Sending live audio...");

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
