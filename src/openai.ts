import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function chat(text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Be concise and succinct." },
      { role: "user", content: text },
    ],
  });

  return response.choices[0].message.content ?? "";
}
