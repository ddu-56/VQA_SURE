import { detectObjects } from "./detect";
import { recognizeText } from "./ocr";
import type { VisionPreprocessResult } from "./types";

export async function preprocessImage(
  base64Data: string,
  mimeType: string
): Promise<VisionPreprocessResult> {
  const start = Date.now();

  const [detectionResult, ocrResult] = await Promise.allSettled([
    detectObjects(base64Data, mimeType),
    recognizeText(base64Data),
  ]);

  return {
    detectedObjects:
      detectionResult.status === "fulfilled" ? detectionResult.value : [],
    ocrText: ocrResult.status === "fulfilled" ? ocrResult.value : null,
    processingTimeMs: Date.now() - start,
  };
}

/**
 * Formats preprocessing results into a structured text block
 * to be prepended to the Gemini prompt.
 */
export function formatVisionContext(result: VisionPreprocessResult): string {
  const sections: string[] = [];

  if (result.detectedObjects.length > 0) {
    // Group objects by label with counts
    const labelCounts = new Map<string, number>();
    for (const obj of result.detectedObjects) {
      labelCounts.set(obj.label, (labelCounts.get(obj.label) || 0) + 1);
    }

    const summary = Array.from(labelCounts.entries())
      .map(([label, count]) => `${count}x ${label}`)
      .join(", ");

    const details = result.detectedObjects
      .map((obj, i) => {
        const { xmin, xmax, ymin, ymax } = obj.box;
        const centerX = (xmin + xmax) / 2;
        const centerY = (ymin + ymax) / 2;
        const hRegion =
          centerX < 0.33 ? "left" : centerX > 0.66 ? "right" : "center";
        const vRegion =
          centerY < 0.33 ? "top" : centerY > 0.66 ? "bottom" : "middle";
        return `  ${i + 1}. ${obj.label} (${(obj.score * 100).toFixed(1)}%) - ${vRegion}-${hRegion} region`;
      })
      .join("\n");

    sections.push(`[DETECTED OBJECTS: ${summary}]\n${details}`);
  }

  if (result.ocrText) {
    sections.push(
      `[DETECTED TEXT (${result.ocrText.confidence}% confidence)]: "${result.ocrText.text}"`
    );
  }

  if (sections.length === 0) {
    return "";
  }

  return (
    "--- PRE-ANALYZED IMAGE DATA (from object detection + OCR) ---\n" +
    sections.join("\n\n") +
    "\n--- END PRE-ANALYZED DATA ---\n\n"
  );
}
