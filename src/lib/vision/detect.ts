import type { ObjectDetectionPipeline } from "@huggingface/transformers";
import type { DetectedObject } from "./types";

const DETECTION_MODEL = "Xenova/detr-resnet-50";
const CONFIDENCE_THRESHOLD = 0.7;
const TIMEOUT_MS = 15_000;

// Dynamic import avoids TypeScript overload resolution issues with pipeline()
async function loadPipeline(): Promise<ObjectDetectionPipeline> {
  const { pipeline } = await import("@huggingface/transformers");
  const detector = await (pipeline as Function)(
    "object-detection",
    DETECTION_MODEL,
    { dtype: "fp32" }
  );
  return detector as ObjectDetectionPipeline;
}

// Lazy singleton with HMR protection (follows official HF Next.js pattern)
const createDetectorSingleton = () => {
  let instance: Promise<ObjectDetectionPipeline> | null = null;
  return {
    getInstance(): Promise<ObjectDetectionPipeline> {
      if (!instance) {
        instance = loadPipeline();
      }
      return instance;
    },
  };
};

type DetectorSingleton = ReturnType<typeof createDetectorSingleton>;

let detector: DetectorSingleton;
if (process.env.NODE_ENV !== "production") {
  const g = globalThis as unknown as { __detector?: DetectorSingleton };
  if (!g.__detector) {
    g.__detector = createDetectorSingleton();
  }
  detector = g.__detector;
} else {
  detector = createDetectorSingleton();
}

export async function detectObjects(
  base64Data: string,
  mimeType: string
): Promise<DetectedObject[]> {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  try {
    const model = await detector.getInstance();

    const result = await Promise.race([
      model(dataUrl, { threshold: CONFIDENCE_THRESHOLD, percentage: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Detection timeout")), TIMEOUT_MS)
      ),
    ]);

    return (result as unknown as DetectedObject[]).map((obj) => ({
      label: obj.label,
      score: Math.round(obj.score * 1000) / 1000,
      box: obj.box,
    }));
  } catch (error) {
    console.error("[Vision/Detect] Object detection failed:", error);
    return [];
  }
}
