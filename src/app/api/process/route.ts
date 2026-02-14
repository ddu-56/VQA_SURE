import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

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

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemPrompt =
    mode === "one-pass" ? ONE_PASS_SYSTEM_PROMPT : ITERATIVE_SYSTEM_PROMPT;
  const mimeType = getMimeType(base64Data);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  // Build the image part for Gemini
  const imagePart = {
    inlineData: { data: base64Data, mimeType },
  };

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
    if (mode === "iterative" && history && history.length > 0) {
      // Start a chat with history for iterative mode
      const chat = model.startChat({
        history: [
          // First turn: image + initial prompt
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
          // Remaining history as text-only turns
          ...history.slice(1).map((msg) => ({
            role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
            parts: [{ text: msg.content }],
          })),
        ],
      });

      const followUp =
        userMessage || "Please continue describing the image.";
      const result = await chat.sendMessageStream(followUp);

      // Return streaming response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                const data = JSON.stringify({ text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
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

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // First request (one-pass or first iterative turn)
      let prompt: string;
      if (userMessage) {
        prompt = visionContext + userMessage;
      } else if (mode === "one-pass") {
        prompt =
          visionContext + "Please describe this image in detail following your instructions.";
      } else {
        prompt =
          visionContext + "Please give me an overview of this image and highlight any ambiguities.";
      }

      const result = await model.generateContentStream([prompt, imagePart]);

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                const data = JSON.stringify({ text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
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

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
