"use client";

import { useEffect, useRef } from "react";

interface ResponseDisplayProps {
  content: string;
  isLoading: boolean;
}

export function ResponseDisplay({ content, isLoading }: ResponseDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [content]);

  if (!content && !isLoading) {
    return null;
  }

  return (
    <div
      className="rounded-2xl bg-white/50 border border-primary-100/30 p-6 sm:p-8 animate-fade-in"
      aria-live="polite"
      aria-busy={isLoading}
      role="status"
    >
      {content ? (
        <div ref={scrollRef} className="prose prose-sm max-w-none">
          {content.split("\n").map((paragraph, idx) => {
            if (!paragraph.trim()) return null;

            if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
              return (
                <h3
                  key={idx}
                  className="font-bold text-lg mt-5 mb-2 text-primary-900"
                >
                  {paragraph.replace(/\*\*/g, "")}
                </h3>
              );
            }

            if (paragraph.startsWith("- ")) {
              return (
                <li key={idx} className="ml-4 text-primary-800/80">
                  {paragraph.replace(/^- /, "")}
                </li>
              );
            }

            return (
              <p key={idx} className="text-primary-800/80 leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse-soft"
              style={{ animationDelay: "0s" }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse-soft"
              style={{ animationDelay: "0.3s" }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse-soft"
              style={{ animationDelay: "0.6s" }}
            />
          </div>
          <span className="text-primary-700/60 font-medium">
            Analyzing your image...
          </span>
        </div>
      )}
    </div>
  );
}
