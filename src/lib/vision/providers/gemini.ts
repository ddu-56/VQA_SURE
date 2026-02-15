import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  VisionProvider,
  GenerateParams,
  ChatParams,
} from "./types";

export class GeminiProvider implements VisionProvider {
  readonly name = "gemini";
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *generateStream(params: GenerateParams): AsyncGenerator<string> {
    const { image, mimeType, prompt, systemPrompt } = params;

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const imagePart = {
      inlineData: { data: image, mimeType },
    };

    const result = await model.generateContentStream([prompt, imagePart]);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }

  async *chatStream(params: ChatParams): AsyncGenerator<string> {
    const { image, mimeType, history, userMessage, systemPrompt } = params;

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const imagePart = {
      inlineData: { data: image, mimeType },
    };

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            imagePart,
            {
              text:
                history.find((m) => m.role === "user")?.content ||
                "Please give me an overview of this image and highlight any ambiguities.",
            },
          ],
        },
        ...history.slice(1).map((msg) => ({
          role:
            msg.role === "assistant"
              ? ("model" as const)
              : ("user" as const),
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const followUp = userMessage || "Please continue describing the image.";
    const result = await chat.sendMessageStream(followUp);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}
