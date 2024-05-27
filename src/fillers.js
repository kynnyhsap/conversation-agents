import fs from "fs";

const FILLERS_BASE_PATH = "./src/fillers";

export function getRandomFiller(language, outputFormat) {
  const fillers = JSON.parse(
    fs.readFileSync(`${FILLERS_BASE_PATH}/${language}/spec.json`, "utf-8"),
  );

  const { filename, text } =
    fillers[Math.floor(Math.random() * fillers.length)];

  return {
    fillerText: text,
    fillerPath: `${FILLERS_BASE_PATH}/${language}/${filename}.mp3`,
  };
}
