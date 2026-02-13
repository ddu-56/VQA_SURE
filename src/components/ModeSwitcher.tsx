"use client";

import { useVQAStore } from "@/lib/store";

export function ModeSwitcher() {
  const { mode, setMode } = useVQAStore();

  return (
    <fieldset className="flex gap-1 p-1 rounded-xl glass-card border-0">
      <legend className="sr-only">Select description mode</legend>

      <label
        className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
          mode === "one-pass"
            ? "btn-primary shadow-sm"
            : "text-primary-700 hover:bg-white/50"
        }`}
      >
        <input
          type="radio"
          name="mode"
          value="one-pass"
          checked={mode === "one-pass"}
          onChange={() => setMode("one-pass")}
          className="sr-only"
          aria-label="One Pass mode: Get a full description at once"
        />
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="text-sm font-semibold">One Pass</span>
      </label>

      <label
        className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
          mode === "iterative"
            ? "btn-primary shadow-sm"
            : "text-primary-700 hover:bg-white/50"
        }`}
      >
        <input
          type="radio"
          name="mode"
          value="iterative"
          checked={mode === "iterative"}
          onChange={() => setMode("iterative")}
          className="sr-only"
          aria-label="Iterative mode: Ask follow-up questions"
        />
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="text-sm font-semibold">Iterative</span>
      </label>
    </fieldset>
  );
}
