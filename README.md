# Ambiguity-Aware VQA (Visual Question Answering)

A web application that helps users understand complex visual scenes through AI-powered image description. Designed with accessibility in mind for low-vision users.

## Features

- **One-Pass Mode**: Get a full structured description of any image — overview, objects by region, and flagged ambiguities
- **Iterative Mode**: Have a conversation about an image, asking follow-up questions to explore specific details
- **Hybrid Preprocessing**: DETR object detection + Tesseract OCR run locally before the AI model, improving accuracy for object counting and text recognition
- **Dual Provider Support**: Run fully local with Ollama (free, private) or use Google Gemini (cloud)

## Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- [Ollama](https://ollama.com) (for local AI — recommended)

### Install Ollama

**Mac:**
```bash
brew install ollama
```

**Windows/Linux:**
Download from [ollama.com/download](https://ollama.com/download)

### Pull an AI Model

```bash
ollama pull moondream
```

Choose one based on your needs:
| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| `moondream` | ~1.8B params | Fast | Good for most images |
| `llava` | ~7B params | Slower | More detailed descriptions |

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```env
# Vision provider: "ollama" (local, free) or "gemini" (cloud)
VISION_PROVIDER=ollama

# Ollama settings (only needed if using ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=moondream

# Gemini settings (only needed if using gemini)
GEMINI_API_KEY=your_key_here
```

## Running the App

### 1. Start Ollama (in a separate terminal)

```bash
ollama serve
```

### 2. Start the App

```bash
npm run dev
```

### 3. Open in Browser

Go to [http://localhost:3000](http://localhost:3000)

## Usage

1. Select a mode — **One Pass** (full description) or **Iterative** (conversational)
2. Upload an image (drag-drop or click, max 5MB)
3. Click **Describe Image** and wait for the streamed response
4. In iterative mode, type follow-up questions to explore the image further

## Using Gemini Instead of Ollama

If you prefer cloud-based processing (no local install required):

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Set `VISION_PROVIDER=gemini` and your `GEMINI_API_KEY` in `.env.local`
3. No need to run `ollama serve`

Note: Gemini has a free-tier token quota that may be exhausted with heavy use.

## Project Structure

```
src/
  app/
    page.tsx                # Main page — handles API calls and layout
    layout.tsx              # Root layout with metadata
    globals.css             # Design system (glassmorphism, gradients, animations)
    api/process/route.ts    # API endpoint — validation, preprocessing, provider routing
  components/
    ImageUploader.tsx       # Drag-drop image upload with preview
    ModeSwitcher.tsx        # One-pass / Iterative toggle
    ResponseDisplay.tsx     # Streamed one-pass output display
    ChatInterface.tsx       # Iterative conversation UI
  lib/
    store.ts                # Zustand state management
    vision/
      detect.ts             # DETR object detection (local)
      ocr.ts                # Tesseract.js text recognition (local)
      preprocess.ts         # Runs detection + OCR in parallel, formats results
      types.ts              # Shared type definitions
      providers/
        types.ts            # VisionProvider interface
        ollama.ts           # Ollama provider (local)
        gemini.ts           # Gemini provider (cloud)
        index.ts            # Provider factory
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand
- **Backend**: Next.js API Routes (Node.js runtime)
- **AI Providers**: Ollama (local) / Google Gemini (cloud)
- **Preprocessing**: DETR object detection (`@huggingface/transformers`), Tesseract.js OCR
- **Streaming**: Server-Sent Events (SSE)

## Stopping the App

1. Press `Ctrl+C` in the terminal running `npm run dev`
2. Press `Ctrl+C` in the terminal running `ollama serve`

The pulled model stays cached on disk — no need to re-download next time.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Cannot connect to Ollama" | Make sure `ollama serve` is running in another terminal |
| Slow first request | The DETR model (~40MB) downloads on first use — subsequent requests are faster |
| Gemini 429 error | Free-tier quota exhausted — wait or switch to `VISION_PROVIDER=ollama` |
| Build errors with sharp/onnxruntime | Run `npm install` again — native dependencies may need rebuilding |
