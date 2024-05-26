import { spawn } from "bun";
import { parseArgs } from "util";
import { listedForKeyHold } from "./stdin";

const output_format = "mp3_44100";

const URL = `ws://localhost:3000?output_format=${output_format}`;

const SAMPLE_RATE = 44100;
const CHANNELS = 2;

const { values: args } = parseArgs({
  args: Bun.argv,
  allowPositionals: true,
  options: {
    // audio device index
    index: { type: "string" },
  },
});

// to determin the index of the audio device run this command:
// ffmpeg -f avfoundation -list_devices true -i ""
const AUDIO_DEVICE_INDEX = Number(args.index) ?? 0;

const command = `ffmpeg -f avfoundation -i :${AUDIO_DEVICE_INDEX} -ac ${CHANNELS} -ar ${SAMPLE_RATE} -f wav -`;
const ffmpeg = spawn(command.split(" "), { stderr: "ignore" });
const recordingStream = ffmpeg.stdout;

const ws = new WebSocket(URL);

ws.addEventListener("open", async (event) => {
  console.log("[Simulated WS] Connected to websocket. Sending live audio...");

  // @ts-ignore
  for await (const chunk of recordingStream) {
    // console.log("[Simulated WS] Sending chunk...", chunk.length);

    if (listening) {
      ws.send(chunk);
    }
  }
});

let listening = false;
const keyHoldEmitter = listedForKeyHold();
keyHoldEmitter.addListener("start", () => {
  ws.send(JSON.stringify({ type: "start" }));
  console.log("[STARTED]");
  listening = true;
});
keyHoldEmitter.addListener("stop", () => {
  ws.send(JSON.stringify({ type: "stop" }));
  console.log("[STOPPED]");
  listening = false;
});
keyHoldEmitter.addListener("exit", () => {
  console.log("[EXITED]");
  process.exit();
});
// e.addListener("hold", () => Bun.write(stdin, "."));

const mpv = spawn(`mpv -`.split(" "), {
  stdin: "pipe",
  stderr: "ignore",
});

const outputAudioBuffers: Uint8Array[] = [];

ws.addEventListener("message", async (event) => {
  const buf = event.data as Uint8Array;

  outputAudioBuffers.push(buf);

  if (!listening) {
    while (outputAudioBuffers.length > 0) {
      const buf = outputAudioBuffers.shift();

      if (buf) {
        mpv.stdin.write(buf);
        mpv.stdin.flush();
        Bun.sleep(100);
      }
    }
  }
});
