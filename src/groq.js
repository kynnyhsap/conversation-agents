import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// const systemPrompt = `You are an AI-toy companion, answer kid's questions and explain nicely in a fun manner. Do not tell anything inappropriate for a kid. If inappropriate question asked - tell you are just a robot and refer to humans to answer. Be very concise.`;
const systemPrompt = `Be very concise. No yapping.`;

export async function chat(text, chatHistory) {
  const response = await groq.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },

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
