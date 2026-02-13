"use client";

import { useState } from "react";
import { useVQAStore } from "@/lib/store";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { ImageUploader } from "@/components/ImageUploader";
import { ResponseDisplay } from "@/components/ResponseDisplay";
import { ChatInterface } from "@/components/ChatInterface";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => resolve(e.target?.result as string);
    fileReader.onerror = () => reject(new Error("Failed to read file"));
    fileReader.readAsDataURL(file);
  });
}

async function consumeSSEStream(
  response: Response,
  onChunk: (text: string) => void
): Promise<string> {
  const streamReader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!streamReader) {
    throw new Error("No response stream");
  }

  let fullContent = "";
  while (true) {
    const { done, value } = await streamReader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.text) {
          fullContent += parsed.text;
          onChunk(parsed.text);
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message !== "Unexpected end of JSON input"
        ) {
          throw err;
        }
      }
    }
  }

  return fullContent;
}

export default function Home() {
  const { mode, image, isLoading, setIsLoading, addMessage } = useVQAStore();
  const [responseContent, setResponseContent] = useState("");

  const handleProcessImage = async () => {
    if (!image) {
      alert("Please upload an image first.");
      return;
    }

    setIsLoading(true);
    setResponseContent("");

    try {
      const base64 = await readFileAsDataURL(image);

      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process image");
      }

      const fullContent = await consumeSSEStream(response, (text) => {
        setResponseContent((prev) => prev + text);
      });

      addMessage({ role: "assistant", content: fullContent });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An error occurred";
      alert(`Error: ${message}`);
      setResponseContent("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!image) return;

    const previousHistory = useVQAStore.getState().chatHistory;
    addMessage({ role: "user", content: userMessage });
    setIsLoading(true);

    try {
      const base64 = await readFileAsDataURL(image);

      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mode: "iterative",
          userMessage,
          history: previousHistory,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process message");
      }

      const fullContent = await consumeSSEStream(response, () => {});

      addMessage({ role: "assistant", content: fullContent });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An error occurred";
      alert(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-main wave-container">
      {/* Navigation */}
      <nav className="glass-card sticky top-0 z-50 border-x-0 border-t-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold text-primary-800">
                VisionVQA
              </span>
            </div>

            {/* Mode Switcher in Nav */}
            <ModeSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 text-center relative z-10">
        <div className="glass-card rounded-3xl px-8 py-12 sm:px-12 sm:py-16">
          {/* Pill Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-primary-200/40 text-sm font-medium text-primary-700 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-soft" />
            AI-Powered Image Understanding
          </div>

          <h1
            className="animate-fade-in-up text-4xl sm:text-5xl font-bold tracking-tight text-primary-900 mb-4"
            style={{ animationDelay: "0.1s" }}
          >
            See Beyond the Surface
          </h1>

          <p
            className="animate-fade-in-up max-w-2xl mx-auto text-lg text-primary-700/70"
            style={{ animationDelay: "0.2s" }}
          >
            Upload an image and get detailed, accessible descriptions that
            explicitly address visual ambiguity.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 relative z-10">
        {/* Upload Card */}
        <section
          aria-labelledby="upload-heading"
          className="animate-fade-in-up mb-8"
          style={{ animationDelay: "0.3s" }}
        >
          <h2 id="upload-heading" className="sr-only">
            Image upload
          </h2>
          <ImageUploader />
        </section>

        {/* Action + Response Area */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          {/* Action Button (One Pass) */}
          {image && mode === "one-pass" && (
            <section className="mb-6">
              <button
                onClick={handleProcessImage}
                disabled={isLoading}
                className="btn-primary w-full px-6 py-3.5 rounded-xl font-semibold text-base"
                aria-label="Analyze image with One Pass mode"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg
                      className="animate-spin w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Analyzing Image...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Analyze Image
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </span>
                )}
              </button>
            </section>
          )}

          {/* Response Area */}
          {mode === "one-pass" ? (
            <ResponseDisplay content={responseContent} isLoading={isLoading} />
          ) : (
            <section aria-labelledby="chat-heading">
              <h2 id="chat-heading" className="sr-only">
                Chat interface
              </h2>
              {image ? (
                <ChatInterface
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              ) : (
                <div className="rounded-2xl bg-white/40 border border-primary-100/30 p-8 text-center">
                  <p className="text-primary-700/50 italic">
                    Upload an image to start the conversation.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
