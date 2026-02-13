/**
 * Quick test script for the /api/process route.
 * Usage: npx tsx scripts/test-api.ts
 *
 * Requires the Next.js dev server to be running on port 3000.
 * Uses a tiny 1x1 red PNG as a test image.
 */

// Minimal 1x1 red pixel PNG in base64
const TINY_RED_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

const API_URL = "http://localhost:3000/api/process";

async function testOnePass() {
  console.log("--- Testing One Pass Mode ---\n");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: TINY_RED_PNG,
      mode: "one-pass",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Error:", err);
    return;
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    console.error("No readable stream");
    return;
  }

  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = line.slice(6); // remove "data: "
      if (data === "[DONE]") {
        console.log("\n\n--- Stream complete ---");
        break;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          console.error("Stream error:", parsed.error);
        } else {
          process.stdout.write(parsed.text);
          fullText += parsed.text;
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  console.log(`\n\nTotal response length: ${fullText.length} chars`);
}

async function testIterative() {
  console.log("\n--- Testing Iterative Mode ---\n");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: TINY_RED_PNG,
      mode: "iterative",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Error:", err);
    return;
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    console.error("No readable stream");
    return;
  }

  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") {
        console.log("\n\n--- Stream complete ---");
        break;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          console.error("Stream error:", parsed.error);
        } else {
          process.stdout.write(parsed.text);
          fullText += parsed.text;
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  console.log(`\n\nTotal response length: ${fullText.length} chars`);
}

async function testValidation() {
  console.log("\n--- Testing Validation ---\n");

  // Missing fields
  const res1 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  console.log(`Missing fields: ${res1.status} -`, await res1.json());

  // Invalid mode
  const res2 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: TINY_RED_PNG, mode: "invalid" }),
  });
  console.log(`Invalid mode:   ${res2.status} -`, await res2.json());
}

async function main() {
  console.log("VQA API Route Test\n==================\n");

  await testValidation();
  await testOnePass();
  await testIterative();
}

main().catch(console.error);
