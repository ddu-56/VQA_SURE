# Local VQA Implementation Roadmap & Strategy

## 1. Goal Description
The objective is to replace or augment the current cloud-based Gemini image recognition with a local, token-free alternative. This allows users to perform "ambiguity-aware image description" without incurring ongoing API costs ("tokens").

## 2. Technical Strategy
We will implement a flexible **Vision Provider** architecture that abstracts the underlying model execution.

**Two Main Approaches:**
1.  **Local Server (Ollama)**: 
    -   **Pros**: High quality (LLaVA v1.6, Moondream), fast on GPU.
    -   **Cons**: Requires user to install/run Ollama separately.
    -   **Recommendation**: Default choice for quality necessary for "ambiguity-aware" descriptions.
2.  **In-Browser (Transformers.js)**: 
    -   **Pros**: Zero setup, runs in user's browser.
    -   **Cons**: Smaller models (Janus/BLIP) are less capable and slower on CPU.
    -   **Role**: Fallback or "light" mode.

## 3. Implementation Plan

### Phase 1: Architecture Changes
**Lib Layer (`src/lib/vision`)**
-   **Create `VisionProvider` Interface**: Define a common contract for `describeImage(imageBuffer)` and `chat(imageBuffer, history)`.
-   **Implement `VisionService`**: A factory/service that instantiates the correct provider based on configuration.

### Phase 2: Provider Implementation
**Ollama Provider (`src/lib/vision/providers/ollama.ts`)**
-   Implement `OllamaProvider` using `ollama-js` or direct fetch to `http://localhost:11434`.
-   Support models like `moondream` (fast) and `llava` (detailed).

**Gemini Provider (`src/lib/vision/providers/gemini.ts`)**
-   Refactor existing Gemini logic into a provider for backward compatibility.

### Phase 3: API Integration
**API Route (`src/app/api/process/route.ts`)**
-   Update the route to use `VisionService` instead of direct Gemini calls.
-   Read configuration from `.env.local` to determine which provider to load.

### Phase 4: Configuration & UX
-   **Environment Variables**: Add `VISION_PROVIDER` (ollama | gemini), `OLLAMA_BASE_URL`, `OLLAMA_MODEL`.
-   **Error Handling**: Graceful fallback or clear error messages if Ollama is not running.

## 4. Verification Plan

### Manual Verification Steps
1.  **Ollama Setup**:
    -   Install Ollama (`brew install ollama`).
    -   Pull model: `ollama pull moondream`.
2.  **Test One-Pass Mode**:
    -   Configure app to use Ollama via `.env`.
    -   Upload an image and verify the description comes from the local model.
3.  **Test Iterative Mode**:
    -   Engage in a chat session about the image.
    -   Verify context is maintained across turns using Ollama's chat API.
