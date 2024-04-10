// IMPORTANT: the audio recorded by the MediaRecorder is what considered "conteinerized" aduio,
// so when this data is passed to deepgram it should NOT specify encoding, sample_rate and channels
// https://developers.deepgram.com/docs/determining-your-audio-format-for-live-streaming-audio/#streaming-containerized-audio

const audioContext = new AudioContext({
  sampleRate: 44_100,
});

let sourceNode;

function playAudio(arrayBuffer) {
  const audioBuffer = new AudioBuffer({
    length: arrayBuffer.byteLength / 2,
    numberOfChannels: 1,
    sampleRate: 44_100,
  });

  const channelData = audioBuffer.getChannelData(0);
  const dataView = new Float32Array(arrayBuffer);
  channelData.set(dataView);

  if (sourceNode) {
    sourceNode.disconnect();
  }
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(audioContext.destination);
  sourceNode.start(0);
}

const output_format = "pcm_44100"; // "mp3_44100";

const ws = new WebSocket(`ws://localhost:3000?output_format=${output_format}`);

ws.addEventListener("open", async (event) => {
  console.log("[WSS] Connected to websocket. Sending live audio...");
});

ws.addEventListener("message", async (event) => {
  console.log("[WSS] Decoding audio from message...", event.data);

  const audioBlob = event.data;
  const buff = await audioBlob.arrayBuffer();
  playAudio(buff);

  // Convert the received audio blob to an ArrayBuffer
  // const fileReader = new FileReader();
  // fileReader.onload = () => {
  //   const arrayBuffer = fileReader.result;
  //   playAudio(arrayBuffer);
  // };
  // fileReader.readAsArrayBuffer(audioBlob);
});
ws.addEventListener("close", () => console.log("[WSS] Connection closed."));
ws.addEventListener("error", () => console.error("[WSS] error."));

async function main() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);

  // let firstChunk = undefined;
  recorder.ondataavailable = async (event) => {
    if (event.data.size === 0 || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    console.log("[Recorder] Sending audio chunk to websocket...", event.data);
    ws.send(event.data);
  };

  recorder.start(1000);

  // stop recording after 10 seconds
  setTimeout(() => {
    recorder.stop();
    ws.close();
  }, 10000);
}

main();
