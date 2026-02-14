# Ambiguity-Aware VQA Application Roadmap & Strategy (Hybrid Token-Efficient)

## Project Goal
Build an accessible prototype application (Web/Mobile) that provides detailed, ambiguity-aware image descriptions. The core value is helping users—especially those with low vision—understand complex visual scenes by explicitly addressing ambiguity through two distinct interaction modes.

## Technical Strategy: Hybrid Token-Efficient Pipeline

To minimize expensive "Vision Token" costs while maintaining high accuracy for counting and localization, we will use a **Two-Stage Pipeline** that combines traditional Computer Vision (Object Detection + OCR) with Generative AI.

### 1. Stage 1: Structural Analysis (Low Cost / Local)
Instead of sending every pixel to a large VLM, we first extract structured data:
-   **Object Detection (YOLOv8 / MediaPipe):**
    -   Identify classes (e.g., "book", "bottle", "keyboard").
    -   Get precise bounding boxes `[x, y, w, h]` for spatial reasoning (left/right/top/bottom).
    -   Get exact counts (Crucial for ambiguity: "I see 5 books...").
-   **Text Recognition (OCR):**
    -   Use Tesseract or Google Cloud Vision to extract text from objects (e.g., book titles).
-   **Output:** A structured JSON summary of the scene.

### 2. Stage 2: Semantic Synthesis (Generative AI)
-   **Input:** The JSON summary + User Query.
-   **Model:** A cost-effective LLM (e.g., GPT-3.5-Turbo, Llama 3) or a highly efficient VLM (Gemini Flash, GPT-4o-mini).
-   **Role:** Synthesizes the structured data into natural, human-like descriptions.
    -   *Example Prompt:* "Here is a list of objects and text. Describe the scene naturally. Group the books together. Note any ambiguity in the text."

**Pros:**
-   **Cost:** Drastically reduces token usage for simple queries ("How many books?").
-   **Speed:** Local detection is instant.
-   **Control:** Easier to force specific output formats from structured inputs.

**Cons:**
-   **Detail Loss:** YOLO might miss subtle attributes ("gold foil seal"). We mitigate this by sending a low-res image or cropped regions to a cheap VLM *only* when necessary.

## Core Features & Requirements

### 1. Interaction Modes

#### Mode A: Respond in One Pass (Hybrid Optimized)
-   **Goal:** Comprehensive description.
-   **Process:**
    1.  Run YOLO to detect all objects.
    2.  Run OCR on text regions.
    3.  LLM generates a summary: "I see 7 objects: a bottle and a stack of books with titles like 'Construction Materials'..."
-   **Ambiguity Handling:** If YOLO confidence is low or objects overlap heavily, the LLM reports this as visual ambiguity.

#### Mode B: Clarify Iteratively
-   **Goal:** Conversational discovery.
-   **Process:**
    1.  System lists high-level detections: "I see books, a bottle, and cabling."
    2.  User asks: "What about the bottle?"
    3.  System uses the specific bounding box data for the bottle (and potentially runs a VLM on just that crop) to describe it in detail.

### 2. Accessibility (Critical)
-   **Screen Reader First:** Ensure all UI elements are labeled.
-   **Semantic HTML:** Proper heading hierarchies.
-   **Keyboard Navigation:** Full support.

## Architecture Overview

### Tech Stack
-   **Framework:** Next.js (App Router)
-   **Styling:** Tailwind CSS
-   **Frontend CV:** `transformers.js` (for in-browser YOLO if possible) or server-side Python API.
-   **Backend AI:** OpenAI API (GPT-4o-mini).

### Data Flow
1.  **Upload:** User selects image.
2.  **Analyze (API):**
    -   Step 1: Convert image to tensor/blob.
    -   Step 2: Run Inference (YOLO).
    -   Step 3: Run Inference (OCR).
    -   Step 4: Prompt LLM with structured results.
3.  **Response:** JSON data returns to frontend.
4.  **Render:** Screen reader announces results.

## Implementation Phases
1.  **Setup:** Next.js + Tailwind.
2.  **CV Integration:** Set up the Object Detection pipeline (mock or real).
3.  **LLM Integration:** Connect the structured output to the Generative Model.
4.  **UI/UX:** Build the "One Pass" and "Iterative" modes.
5.  **Refinement:** optimize for speed and accuracy.

