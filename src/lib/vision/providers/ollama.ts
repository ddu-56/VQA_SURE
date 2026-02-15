import type {
  VisionProvider,
  GenerateParams,
  ChatParams,
  ChatMessage,
} from "./types";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "moondream";

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

interface OllamaStreamChunk {
  message?: { content: string };
  done: boolean;
}

export class OllamaProvider implements VisionProvider {
  readonly name = "ollama";
  private baseUrl: string;
  private model: string;
  private healthChecked = false;

  constructor(baseUrl?: string, model?: string) {
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.model = model || DEFAULT_MODEL;
  }

  private async checkHealth(): Promise<void> {
    if (this.healthChecked) return;

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`);
      }
      this.healthChecked = true;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Cannot connect to Ollama at ${this.baseUrl}. ` +
          `Ensure Ollama is running (ollama serve) and the model "${this.model}" is pulled. ` +
          `Error: ${msg}`
      );
    }
  }

  private async *streamChat(
    messages: OllamaMessage[]
  ): AsyncGenerator<string> {
    await this.checkHealth();

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama error (${response.status}): ${body}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream from Ollama");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk: OllamaStreamChunk = JSON.parse(line);
            if (chunk.message?.content) {
              yield chunk.message.content;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const chunk: OllamaStreamChunk = JSON.parse(buffer);
          if (chunk.message?.content) {
            yield chunk.message.content;
          }
        } catch {
          // Skip malformed final chunk
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private buildHistoryMessages(
    history: ChatMessage[],
    image: string
  ): OllamaMessage[] {
    return history.map((msg, idx) => {
      const ollamaMsg: OllamaMessage = {
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      };
      // Attach image to the first user message
      if (idx === 0 && msg.role === "user") {
        ollamaMsg.images = [image];
      }
      return ollamaMsg;
    });
  }

  async *generateStream(params: GenerateParams): AsyncGenerator<string> {
    const { image, prompt, systemPrompt } = params;

    const messages: OllamaMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt, images: [image] },
    ];

    yield* this.streamChat(messages);
  }

  async *chatStream(params: ChatParams): AsyncGenerator<string> {
    const { image, history, userMessage, systemPrompt } = params;

    const messages: OllamaMessage[] = [
      { role: "system", content: systemPrompt },
      ...this.buildHistoryMessages(history, image),
      { role: "user", content: userMessage },
    ];

    yield* this.streamChat(messages);
  }
}
