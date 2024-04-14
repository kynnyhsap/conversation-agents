// IMPORTANT: the audio recorded by the MediaRecorder is what considered "conteinerized" aduio,
// so when this data is passed to deepgram it should NOT specify encoding, sample_rate and channels
// https://developers.deepgram.com/docs/determining-your-audio-format-for-live-streaming-audio/#streaming-containerized-audio

const output_format = "mp3_44100";

const ws = new WebSocket(`ws://localhost:3000?output_format=${output_format}`);

ws.addEventListener("error", (e) => console.error("[🍌] error", e));
ws.addEventListener("close", (e) => console.log("[🍌] closed", e));
ws.addEventListener("open", (e) => console.log("[🍌] opened", e));

const audioContext = new AudioContext({});

let audioQueue = [];
let isPlaying = false;

async function handleChunk(blob) {
  const arrayBuffer = await blob.arrayBuffer();

  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  audioQueue.push(audioBuffer);

  if (!isPlaying) {
    playNextChunk();
  }
}

function playNextChunk() {
  if (audioQueue.length === 0) {
    // If the queue is empty, set isPlaying to false and return
    isPlaying = false;
    return;
  }

  // Set isPlaying to true
  isPlaying = true;

  // Get the next audio buffer from the queue
  const buffer = audioQueue.shift();

  // Create an AudioBufferSourceNode
  const source = audioContext.createBufferSource();

  // Set the decoded audio buffer as the buffer property
  source.buffer = buffer;

  // Connect the source to the destination
  source.connect(audioContext.destination);

  // Start playing the audio
  source.start();

  // Listen for the 'ended' event to play the next chunk
  source.onended = function () {
    playNextChunk();
  };
}

ws.addEventListener("message", async (event) => {
  console.log("[🍌] decoding audio from message...", event.data);

  handleChunk(event.data);
});

async function main() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);

  recorder.ondataavailable = async (event) => {
    if (event.data.size === 0 || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    console.log("[📽️] sending recorded audio chunk...", event.data);
    ws.send(event.data);
  };

  recorder.start(500);

  // stop recording after 20 seconds
  setTimeout(() => {
    recorder.stop();
    ws.close();
  }, 20000);
}

main();
