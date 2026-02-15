export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateParams {
  image: string;
  mimeType: string;
  prompt: string;
  systemPrompt: string;
}

export interface ChatParams {
  image: string;
  mimeType: string;
  history: ChatMessage[];
  userMessage: string;
  systemPrompt: string;
}

export interface VisionProvider {
  readonly name: string;

  /** Stream a response for a single image + prompt (one-pass or first iterative turn) */
  generateStream(params: GenerateParams): AsyncGenerator<string>;

  /** Stream a response for an ongoing conversation about an image */
  chatStream(params: ChatParams): AsyncGenerator<string>;
}
