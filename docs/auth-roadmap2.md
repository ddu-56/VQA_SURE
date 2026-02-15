# Local VQA Implementation Roadmap & Strategy

## 1. Goal Description
Replace or augment the cloud-based Gemini image recognition with a local, token-free alternative via **Ollama**. This allows users to perform "ambiguity-aware image description" without incurring ongoing API costs, while keeping Gemini as an optional fallback.

## 2. Technical Strategy
A flexible **Vision Provider** architecture abstracts the underlying model execution. Providers implement a common streaming interface, making the frontend and API route completely provider-agnostic.

**Providers:**
| Provider | Pros | Cons | Default? |
|----------|------|------|----------|
| **Ollama** (local) | Free, private, fast on GPU, high quality (Moondream, LLaVA v1.6) | Requires user to install/run Ollama | Yes |
| **Gemini** (cloud) | No local setup, high quality | Token quota limits on free tier | Fallback |

**Preprocessing Pipeline (DETR + OCR):**
The existing object detection (DETR via `@huggingface/transformers`) and OCR (`tesseract.js`) pipeline runs as a provider-agnostic enhancement layer. Structured detection data is prepended to the prompt sent to *any* provider, improving accuracy for object counting and text recognition.

## 3. Architecture

### Provider Interface
```typescript
interface VisionProvider {
  name: string;
  generateStream(params): AsyncGenerator<string>;  // one-pass + first iterative
  chatStream(params): AsyncGenerator<string>;       // iterative follow-ups
}
```
Both methods return async generators of text chunks, consumed by a shared `createSSEStream()` helper in the API route.

### File Structure
```
src/lib/vision/
  types.ts                    # Detection/OCR types
  detect.ts                   # DETR object detection (singleton)
  ocr.ts                      # Tesseract.js OCR (singleton)
  preprocess.ts               # Orchestrator: runs detect+OCR, formats context
  providers/
    types.ts                  # VisionProvider interface + ChatMessage
    gemini.ts                 # GeminiProvider (uses @google/generative-ai)
    ollama.ts                 # OllamaProvider (uses native fetch to Ollama REST API)
    index.ts                  # Factory: reads VISION_PROVIDER env, returns cached provider
```

### Data Flow
1. Frontend sends `{ image, mode, history?, userMessage? }` to `/api/process`
2. Route validates request, strips base64 prefix, checks size
3. **Preprocessing** (first requests only): DETR + OCR run in parallel, produce structured context
4. **Provider** receives image + augmented prompt, streams response back
5. Route converts async generator → SSE stream → frontend

## 4. Implementation Status

### Phase 1: Provider Architecture — DONE
- `VisionProvider` interface with `generateStream` / `chatStream`
- `getVisionProvider()` factory with singleton caching and env-based selection
- `createSSEStream()` shared helper eliminates duplicated streaming code

### Phase 2: Provider Implementation — DONE
- **OllamaProvider**: Native `fetch()` to Ollama REST API (`/api/chat`), NDJSON streaming, health check on first use
- **GeminiProvider**: Refactored from original route.ts, same Gemini SDK patterns

### Phase 3: API Integration — DONE
- Route uses `getVisionProvider()` instead of direct Gemini calls
- DETR + OCR preprocessing preserved as provider-agnostic layer
- Single SSE streaming path for all providers

### Phase 4: Configuration — DONE
Environment variables in `.env.local`:
```
VISION_PROVIDER=ollama          # "ollama" or "gemini"
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=moondream
GEMINI_API_KEY=...              # only needed if VISION_PROVIDER=gemini
```

## 5. Ollama Setup Guide
```bash
# Install Ollama
brew install ollama

# Start the server
ollama serve

# Pull a model (choose one):
ollama pull moondream    # Fast, lightweight (~1.8B params)
ollama pull llava        # More detailed descriptions (~7B params)
```

## 6. Verification Plan

### Build Verification
- `npm run build` compiles cleanly with no TypeScript errors

### Functional Testing
1. **Ollama One-Pass**: Set `VISION_PROVIDER=ollama`, upload image, verify local model streams description
2. **Ollama Iterative**: Start chat, send follow-up questions, verify context maintained
3. **Gemini One-Pass**: Set `VISION_PROVIDER=gemini`, verify cloud model works as before
4. **Gemini Iterative**: Same chat flow with Gemini backend
5. **Preprocessing**: Check server console for `[Vision] Preprocessed in Xms` logs with both providers
6. **Error Handling**: Stop Ollama → verify clear error: "Cannot connect to Ollama..."
7. **SSE Streaming**: Verify text appears incrementally in the UI (not all at once)
