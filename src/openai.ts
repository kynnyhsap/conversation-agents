import OpenAI from "openai";
import {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function chat(text: string, chatHistory: ChatHisotryItem[]) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Be concise and succinct." },

      ...chatHistory
        .map(({ prompt, message }) => [
          { role: "user", content: prompt } as ChatCompletionUserMessageParam,
          message,
        ])
        .flat(),

      { role: "user", content: text },
    ],
  });

  return response.choices[0].message;
}

export type ChatHisotryItem = {
  prompt: string;
  message: ChatCompletionMessage;
};
