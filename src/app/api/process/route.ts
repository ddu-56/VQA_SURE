import { NextRequest, NextResponse } from "next/server";
import { getVisionProvider } from "@/lib/vision/providers";
import type { ChatMessage } from "@/lib/vision/providers";
import { preprocessImage, formatVisionContext } from "@/lib/vision/preprocess";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const ONE_PASS_SYSTEM_PROMPT = `You are an ambiguity-aware image description assistant designed for users with low vision.

Describe this image in detail. Group objects by region (left/center/right, foreground/background).
For anything unclear, explicitly state the ambiguity: "This appears to be X, but could be Y."
Format your response with clear sections:
- **Overview**: A 2-3 sentence summary of the entire scene.
- **Objects**: Grouped by region, with counts, relative locations, and salient attributes (color, shape, text).
- **Ambiguities**: A bulleted list of anything uncertain or unclear in the image.

IMPORTANT: If the user's message includes a "PRE-ANALYZED IMAGE DATA" section, use it as a factual anchor for your description. Trust the object counts and locations from the detection data. If OCR text is provided, include it verbatim. However, still describe visual details (colors, materials, context) from the image itself, as the pre-analyzed data only covers object identity and location.`;

const ITERATIVE_SYSTEM_PROMPT = `You are an ambiguity-aware image description assistant designed for users with low vision.

On the first turn: Give a brief 2-3 sentence overview of this image. Then list 2-3 specific areas of ambiguity as questions the user might want to explore. Keep it conversational.

On follow-up turns: Answer the user's question about the image in detail. If new ambiguities arise, mention them. Stay conversational and helpful.

IMPORTANT: If the user's message includes a "PRE-ANALYZED IMAGE DATA" section, use it as a factual anchor for your description. Trust the object counts and locations from the detection data. If OCR text is provided, include it verbatim. The pre-analyzed data supplements your visual understanding — use both together.`;

interface ProcessRequest {
  image: string;
  mode: "one-pass" | "iterative";
  history?: ChatMessage[];
  userMessage?: string;
}

function getMimeType(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

/** Convert an async generator of text chunks into an SSE ReadableStream */
function createSSEStream(generator: AsyncGenerator<string>): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const text of generator) {
          const data = JSON.stringify({ text });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Stream processing error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errorMsg })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  let body: ProcessRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { image, mode, history, userMessage } = body;

  if (!image || !mode) {
    return NextResponse.json(
      { error: "Missing required fields: image, mode" },
      { status: 400 }
    );
  }

  if (mode !== "one-pass" && mode !== "iterative") {
    return NextResponse.json(
      { error: 'Invalid mode. Must be "one-pass" or "iterative"' },
      { status: 400 }
    );
  }

  // Strip data URL prefix if present
  const base64Data = image.includes(",") ? image.split(",")[1] : image;

  // Check image size (base64 is ~4/3 the size of the original)
  const estimatedBytes = (base64Data.length * 3) / 4;
  if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds maximum size of ${MAX_IMAGE_SIZE_MB}MB` },
      { status: 400 }
    );
  }

  const mimeType = getMimeType(base64Data);
  const systemPrompt =
    mode === "one-pass" ? ONE_PASS_SYSTEM_PROMPT : ITERATIVE_SYSTEM_PROMPT;

  // Get the configured vision provider
  let provider;
  try {
    provider = getVisionProvider();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Vision provider not configured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Run vision preprocessing on first requests only (not iterative follow-ups)
  const isFirstRequest = !(mode === "iterative" && history && history.length > 0);
  let visionContext = "";
  if (isFirstRequest) {
    try {
      const visionResult = await preprocessImage(base64Data, mimeType);
      visionContext = formatVisionContext(visionResult);
      if (visionContext) {
        console.log(
          `[Vision] Preprocessed in ${visionResult.processingTimeMs}ms: ` +
            `${visionResult.detectedObjects.length} objects, ` +
            `OCR: ${visionResult.ocrText ? "yes" : "no"}`
        );
      }
    } catch (error) {
      console.error("[Vision] Preprocessing failed, continuing without:", error);
    }
  }

  try {
    let stream: AsyncGenerator<string>;

    if (mode === "iterative" && history && history.length > 0) {
      // Iterative follow-up — use chat with history
      stream = provider.chatStream({
        image: base64Data,
        mimeType,
        history,
        userMessage: userMessage || "Please continue describing the image.",
        systemPrompt,
      });
    } else {
      // First request (one-pass or first iterative turn)
      let prompt: string;
      if (userMessage) {
        prompt = visionContext + userMessage;
      } else if (mode === "one-pass") {
        prompt =
          visionContext +
          "Please describe this image in detail following your instructions.";
      } else {
        prompt =
          visionContext +
          "Please give me an overview of this image and highlight any ambiguities.";
      }

      stream = provider.generateStream({
        image: base64Data,
        mimeType,
        prompt,
        systemPrompt,
      });
    }

    return new Response(createSSEStream(stream), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
