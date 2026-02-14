import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "onnxruntime-node", "tesseract.js"],
};

export default nextConfig;
