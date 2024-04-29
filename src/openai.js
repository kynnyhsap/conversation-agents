import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chat(text, chatHistory) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Be concise and succinct." },

      ...chatHistory
        .map(({ prompt, message }) => [
          {
            role: "user",
            content: prompt,
          },

          message,
        ])
        .flat(),

      { role: "user", content: text },
    ],
  });

  return response.choices[0].message;
}

export async function chatStream(text, chatHistory) {
  return await openai.chat.completions.create({
    stream: true,
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Be concise and succinct." },

      ...chatHistory
        .map(({ prompt, message }) => [
          {
            role: "user",
            content: prompt,
          },

          message,
        ])
        .flat(),

      { role: "user", content: text },
    ],
  });
}

// export type ChatHisotryItem = {
//   prompt: string;
//   message: OpenAI.ChatCompletionMessage;
// };
