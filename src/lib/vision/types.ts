export interface DetectedObject {
  label: string;
  score: number;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface VisionPreprocessResult {
  detectedObjects: DetectedObject[];
  ocrText: OCRResult | null;
  processingTimeMs: number;
}
