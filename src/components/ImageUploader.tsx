"use client";

import { useRef, useState } from "react";
import { useVQAStore } from "@/lib/store";

export function ImageUploader() {
  const { image, imagePreview, setImage, setImagePreview } = useVQAStore();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 5) {
      alert("Image must be less than 5MB.");
      return;
    }

    setImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`glass-card-strong rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
          dragActive
            ? "ring-2 ring-primary-400 ring-offset-2 ring-offset-transparent scale-[1.01]"
            : "hover:shadow-lg hover:shadow-primary-500/10"
        }`}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload image area. Click or drag and drop to select an image."
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {imagePreview ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <img
                src={imagePreview}
                alt="Uploaded image preview"
                className="max-h-56 rounded-xl shadow-md shadow-primary-500/10"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-primary-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-primary-700/70">
              <strong className="text-primary-800">{image?.name}</strong>
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImage(null);
                setImagePreview(null);
              }}
              className="btn-secondary px-5 py-2 rounded-xl text-sm font-medium"
              aria-label="Remove uploaded image"
            >
              Remove Image
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-400/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-primary-800 text-lg">
                Upload an image
              </p>
              <p className="text-sm text-primary-700/60 mt-1">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-primary-700/40 mt-2">
                PNG, JPG, GIF, WEBP up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
