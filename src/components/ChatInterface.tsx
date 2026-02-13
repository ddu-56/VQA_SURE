"use client";

import { useState, useRef, useEffect } from "react";
import { useVQAStore } from "@/lib/store";

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInterface({
  onSendMessage,
  isLoading,
}: ChatInterfaceProps) {
  const { chatHistory } = useVQAStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput("");
    }
  };

  return (
    <div className="rounded-2xl bg-white/50 border border-primary-100/30 flex flex-col h-[28rem] overflow-hidden animate-fade-in">
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar"
        role="log"
      >
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-400/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-primary-700/50 text-sm">
              Ask a question about the image to get started.
            </p>
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } animate-fade-in`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "btn-primary rounded-br-md"
                    : "bg-white/80 text-primary-800 border border-primary-100 rounded-bl-md shadow-sm"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white/80 border border-primary-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1.5">
                <div
                  className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-soft"
                  style={{ animationDelay: "0s" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-soft"
                  style={{ animationDelay: "0.3s" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-soft"
                  style={{ animationDelay: "0.6s" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-primary-100/50 p-4 flex gap-3"
        aria-label="Chat input"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the image..."
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-white/60 border border-primary-200/50 rounded-xl text-primary-800 placeholder:text-primary-700/30 disabled:bg-primary-50/50 transition-colors"
          aria-label="Type your question here"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2"
          aria-label="Send message"
        >
          Send
          <svg
            className="w-4 h-4"
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
        </button>
      </form>
    </div>
  );
}
