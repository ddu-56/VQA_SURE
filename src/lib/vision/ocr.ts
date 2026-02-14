import Tesseract from "tesseract.js";
import type { OCRResult } from "./types";

const OCR_TIMEOUT_MS = 30_000;
const MIN_CONFIDENCE = 30;
const MAX_TEXT_LENGTH = 500;

let workerPromise: Promise<Tesseract.Worker> | null = null;

function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker("eng");
  }
  return workerPromise;
}

export async function recognizeText(
  base64Data: string
): Promise<OCRResult | null> {
  try {
    const worker = await getWorker();
    const buffer = Buffer.from(base64Data, "base64");

    const result = await Promise.race([
      worker.recognize(buffer),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OCR timeout")), OCR_TIMEOUT_MS)
      ),
    ]);

    const { text, confidence } = result.data;
    const trimmedText = text.trim();

    if (!trimmedText || confidence < MIN_CONFIDENCE) {
      return null;
    }

    return {
      text: trimmedText.slice(0, MAX_TEXT_LENGTH),
      confidence: Math.round(confidence),
    };
  } catch (error) {
    console.error("[Vision/OCR] Text recognition failed:", error);
    return null;
  }
}
