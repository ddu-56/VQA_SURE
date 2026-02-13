import { create } from "zustand";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VQAStore {
  mode: "one-pass" | "iterative";
  image: File | null;
  imagePreview: string | null;
  chatHistory: ChatMessage[];
  isLoading: boolean;

  setMode: (mode: "one-pass" | "iterative") => void;
  setImage: (file: File | null) => void;
  setImagePreview: (dataUrl: string | null) => void;
  addMessage: (msg: ChatMessage) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useVQAStore = create<VQAStore>((set) => ({
  mode: "one-pass",
  image: null,
  imagePreview: null,
  chatHistory: [],
  isLoading: false,

  setMode: (mode) => set({ mode }),

  setImage: (file) => {
    set({ image: file, chatHistory: [] }); // Reset history on new image
  },

  setImagePreview: (dataUrl) => set({ imagePreview: dataUrl }),

  addMessage: (msg) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, msg],
    })),

  setIsLoading: (loading) => set({ isLoading: loading }),

  reset: () =>
    set({
      image: null,
      imagePreview: null,
      chatHistory: [],
      isLoading: false,
      mode: "one-pass",
    }),
}));
