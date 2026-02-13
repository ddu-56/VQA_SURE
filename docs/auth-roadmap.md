# Ambiguity-Aware VQA Application Roadmap & Strategy

## Project Goal
Build an accessible prototype application (Web/Mobile) that provides detailed, ambiguity-aware image descriptions. The core value is helping users—especially those with low vision—understand complex visual scenes by explicitly addressing ambiguity through two distinct interaction modes.

---

## Core Features & Requirements

### 1. Inputs & Outputs
- **Input:**
  - Image containing multiple objects (max 5MB).
  - User question (text).
- **Output:**
  - **Ambiguity-Aware Description:** Explicitly states what is ambiguous (e.g., "This appears to be X, but could be Y").
  - **Object Details:** Counts, relative locations (left/right/top/bottom), salient attributes (color, shape, text).
  - **Grouped Information:** "Three books on the left..." followed by details.
  - **Shareable Result:** User can copy or save the description as plain text.

> **Note — Video (v2):** Video support (keyframe extraction, temporal ambiguity) is intentionally deferred. The prototype focuses exclusively on still images.

### 2. Interaction Modes
The application must support two distinct modes:

#### Mode A: Respond in One Pass
- **Goal:** Comprehensive, structured description in a single response.
- **Experience:** User uploads → System analyzes → System returns a full streamed report.
- **Content:** Aggregates all detected objects, resolves basic ambiguity where possible, and clearly states what remains ambiguous.

**System Prompt:**
```
Describe this image in detail. Group objects by region (left/center/right, foreground/background).
For anything unclear, explicitly state the ambiguity: "This appears to be X, but could be Y."
Format your response with clear sections: Overview, Objects, Ambiguities.
```

#### Mode B: Clarify Iteratively
- **Goal:** Conversational discovery of image content.
- **Experience:**
  1. User uploads.
  2. System gives a 2–3 sentence high-level summary and lists 2–3 ambiguities as questions.
  3. User asks a follow-up.
  4. System provides specific details. History persists for the session; uploading a new image resets history.

**System Prompt (turn 1):**
```
Give a brief 2-3 sentence overview of this image. Then list 2-3 specific areas of ambiguity
as questions the user might want to explore. Keep it conversational.
```

### 3. Accessibility (Critical)
- **Screen Reader First:** All UI elements labeled and navigable via VoiceOver, NVDA, TalkBack.
- **Semantic HTML:** Proper heading hierarchy and landmark regions.
- **Keyboard Navigation:** Full non-mouse interaction support; never suppress `outline` focus rings.
- **Streaming Output:** Render to `aria-live="polite"` regions so screen readers announce content as it arrives.
- **Accessibility is a hard gate** — each phase must pass an axe/Lighthouse audit before proceeding.

---

## Technical Strategy

### Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Management:** Zustand
- **AI Model:** Claude claude-opus-4-6 (`claude-opus-4-6`) via Anthropic SDK (`@anthropic-ai/sdk`)

### Why Claude claude-opus-4-6
Claude excels at nuanced, hedged language ("this *appears* to be...") which maps directly to the ambiguity-aware output requirement. A single multimodal model handles both modes via system prompt — no separate object detection pipeline needed at prototype stage.

### API Contract

**Endpoint:** `POST /api/process`

```typescript
// Request
{
  image: string;          // base64-encoded image (max 5MB enforced server-side)
  mode: "one-pass" | "iterative";
  history?: {             // iterative mode only
    role: "user" | "assistant";
    content: string;
  }[];
  userMessage?: string;   // iterative follow-up text
}

// Response (streamed text/event-stream)
{
  content: string;        // markdown-formatted description
  ambiguities?: string[]; // extracted list for iterative mode UI hints
}
```

**Error handling:**
- `400` — image exceeds `MAX_IMAGE_SIZE_MB = 5` or missing required fields
- `500` — upstream API failure, with a user-friendly fallback message
- Guard route: return `500` immediately if `ANTHROPIC_API_KEY` is not set

### State (Zustand Store)

```typescript
interface VQAStore {
  mode: "one-pass" | "iterative";
  image: File | null;
  chatHistory: { role: "user" | "assistant"; content: string }[];
  isLoading: boolean;
  setMode: (mode: "one-pass" | "iterative") => void;
  setImage: (file: File) => void;   // also calls reset() on new image
  addMessage: (msg: Message) => void;
  reset: () => void;                // clears history + image
}
```

### Frontend Components
1. **`Layout`** — accessible shell with landmark regions (`<main>`, `<nav>`, `<header>`).
2. **`ModeSwitcher`** — toggle with `role="radiogroup"`, keyboard navigable.
3. **`ImageUploader`** — drag & drop + keyboard; shows preview with alt text field.
4. **`ResponseDisplay`** *(One Pass)* — structured, streamed text blocks in `aria-live` region.
5. **`ChatInterface`** *(Iterative)* — conversational UI with history; message list is `aria-live`.
6. **`ShareResult`** — copy-to-clipboard button with accessible confirmation feedback.

### Data Flow
1. User selects mode and uploads image.
2. Frontend validates size, encodes to base64, dispatches to Zustand store.
3. `POST /api/process` — server constructs mode-specific prompt, calls Claude with `stream: true`.
4. Streamed response written to `aria-live` region in real time.
5. Iterative mode: response appended to `chatHistory`; user sends follow-up; history included in next request.
6. New image upload triggers `reset()` — clears history, resets UI.

---

## Implementation Phases

| # | Phase | Build | Done When |
|---|-------|-------|-----------|
| 1 | **Project Setup** | `create-next-app` (App Router + Tailwind + TypeScript), install Zustand + Anthropic SDK, set up `.env.local` with `ANTHROPIC_API_KEY` | App runs at `localhost:3000`; env var loads correctly |
| 2 | **API Route** | Build `/api/process`, integrate Claude claude-opus-4-6 with streaming, handle both mode prompts, enforce 5MB limit, add error guards | API returns a streamed ambiguity-aware description for a hardcoded test image |
| 3 | **Accessible UI Shell** | Layout, `ModeSwitcher`, `ImageUploader` with drag-drop + keyboard; wire Zustand store | Passes axe/Lighthouse a11y audit; full keyboard navigation works |
| 4 | **Mode A — One Pass** | `ResponseDisplay` with streamed output to `aria-live` region, `ShareResult` copy button | User uploads image, receives structured streamed report; screen reader announces content |
| 5 | **Mode B — Iterative** | `ChatInterface` with Zustand-managed history, follow-up input, history reset on new image | Multi-turn conversation works; new image upload clears history correctly |
| 6 | **Polish & Audit** | Loading/error states, mobile responsiveness, final axe audit, copy-to-clipboard confirmation | No axe violations; usable on mobile with screen reader enabled |

> **v2 Backlog:** Video support (keyframe extraction, temporal ambiguity descriptions).
