import type { VisionProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";

let cachedProvider: VisionProvider | null = null;

export function getVisionProvider(): VisionProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = (
    process.env.VISION_PROVIDER || "ollama"
  ).toLowerCase();

  switch (providerName) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "your_key_here") {
        throw new Error(
          "VISION_PROVIDER is set to 'gemini' but GEMINI_API_KEY is not configured."
        );
      }
      cachedProvider = new GeminiProvider(apiKey);
      break;
    }

    case "ollama": {
      cachedProvider = new OllamaProvider(
        process.env.OLLAMA_BASE_URL,
        process.env.OLLAMA_MODEL
      );
      break;
    }

    default:
      throw new Error(
        `Unknown VISION_PROVIDER: "${providerName}". Must be "ollama" or "gemini".`
      );
  }

  console.log(`[Vision] Using provider: ${cachedProvider.name}`);
  return cachedProvider;
}

export type { VisionProvider, ChatMessage } from "./types";
