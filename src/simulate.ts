import { spawn } from "bun";
import { parseArgs } from "util";

const output_format = "mp3_44100";

const URL = `ws://localhost:3000?output_format=${output_format}`;

const SAMPLE_RATE = 44100;
const CHANNELS = 2;

const { values: args } = parseArgs({
  args: Bun.argv,
  allowPositionals: true,
  options: {
    index: { type: "string" }, // audio device index
  },
});

// to determin the index of the audio device run this command:
// ffmpeg -f avfoundation -list_devices true -i ""
const AUDIO_DEVICE_INDEX = Number(args.index) ?? 0;

const command = `ffmpeg -f avfoundation -i :${AUDIO_DEVICE_INDEX} -ac ${CHANNELS} -ar ${SAMPLE_RATE} -f wav -`;
const ffmpeg = spawn(command.split(" "), { stderr: "ignore" });
const recordingStream = ffmpeg.stdout;
// const recordingStream = Bun.file("experiments/input-audio-2.pcm").stream();

const ws = new WebSocket(URL);

ws.addEventListener("open", async (event) => {
  console.log("[Simulated WS] Connected to websocket. Sending live audio...");

  // @ts-ignore
  for await (const chunk of recordingStream) {
    // console.log("[Simulated WS] Sending chunk...", chunk.length);
    ws.send(chunk);
  }
});

// useful options:
// --audio-device=coreaudio/BuiltInSpeakerDevice

const mpv = spawn(`mpv -`.split(" "), {
  stdin: "pipe",
  // stderr: "ignore", // run quietly
});

ws.addEventListener("message", async (event) => {
  const buf = event.data as Uint8Array;

  // console.log("message", event);

  mpv.stdin.write(buf);
  mpv.stdin.flush();
});
