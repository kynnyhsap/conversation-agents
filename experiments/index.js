const dotenv = require("dotenv");
dotenv.config();

const recorder = require("node-record-lpcm16");

const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

const live = async () => {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const connection = deepgram.listen.live({
    model: "nova-2",
    language: "en-US",
    smart_format: true,
    channels: 1,
    encoding: "linear16",
    sample_rate: 16_000,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Connection opened.");

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Connection closed.");
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      console.log(data.channel.alternatives[0].transcript);
    });

    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log(data);
    });

    connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error(err);
    });

    const recording = recorder.record({
      channels: 1,
      sampleRate: 16_000,
      audioType: "wav", // Linear PCM
    });

    const recordingStream = recording.stream();

    recordingStream.on("readable", () => {
      const data = recordingStream.read();
      connection.send(data);
    });
  });
};

live();
