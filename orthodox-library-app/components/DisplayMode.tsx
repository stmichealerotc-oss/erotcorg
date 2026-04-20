/**
 * Display Mode (Projector Mode)
 * Fullscreen display for church projector
 * - Large font
 * - Role-based colors
 * - Navigation controls
 * - Auto-scroll option
 */

"use client";

import { useState, useEffect } from "react";
import { LiturgicalBlock as LiturgicalBlockType, Language, Book } from "@/models/types";
import { getTranslation, getRoleBackgroundColor, styleToClasses } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

interface DisplayModeProps {
  book: Book;
  blocks: LiturgicalBlockType[];
}

export default function DisplayMode({ book, blocks }: DisplayModeProps) {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [language, setLanguage] = useState<Language>("ti");
  const [fontSize, setFontSize] = useState(4); // text-4xl
  const [autoScroll, setAutoScroll] = useState(false);

  const currentBlock = blocks[currentBlockIndex];

  // Auto-scroll functionality
  useEffect(() => {
    if (!autoScroll) return;

    const timer = setTimeout(() => {
      if (currentBlockIndex < blocks.length - 1) {
        setCurrentBlockIndex(currentBlockIndex + 1);
      }
    }, 8000); // 8 seconds per block

    return () => clearTimeout(timer);
  }, [autoScroll, currentBlockIndex, blocks.length]);

  const goNext = () => {
    if (currentBlockIndex < blocks.length - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
    }
  };

  if (!currentBlock) {
    return (
      <div className="w-screen h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-2xl">No blocks available</p>
      </div>
    );
  }

  const text = getTranslation(currentBlock.translations as Record<string, string | undefined>, language, "");
  const bgColor = getRoleBackgroundColor(currentBlock.role);
  const fontSizes: Record<number, string> = {
    2: "text-2xl",
    3: "text-3xl",
    4: "text-4xl",
    5: "text-5xl",
    6: "text-6xl",
  };

  return (
    <>
      {/* Main Display Area */}
      <div className={`fixed inset-0 ${bgColor} flex items-center justify-center p-8`}>
        <div className="text-center max-w-4xl">
          {/* Role indicator */}
          {currentBlock.role && (
            <p className="text-white text-xl font-semibold mb-6 opacity-75">
              {currentBlock.role.toUpperCase()}
            </p>
          )}

          {/* Main text */}
          <p
            className={`${fontSizes[fontSize]} font-serif text-white leading-relaxed font-bold`}
          >
            {text}
          </p>

          {/* Rubric indicator */}
          {currentBlock.isRubric && (
            <p className="text-white text-lg mt-6 italic opacity-60">[Instruction]</p>
          )}

          {/* Block counter */}
          <p className="text-white text-sm mt-8 opacity-50">
            Block {currentBlockIndex + 1} of {blocks.length}
          </p>
        </div>
      </div>

      {/* Control Panel - Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white p-4 flex items-center justify-between">
        <div className="flex gap-4">
          {/* Navigation */}
          <button
            onClick={goPrev}
            disabled={currentBlockIndex === 0}
            className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <span className="text-sm self-center">{currentBlockIndex + 1}</span>
          <button
            onClick={goNext}
            disabled={currentBlockIndex === blocks.length - 1}
            className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Language selector */}
        <div className="flex gap-2">
          {(["gez", "ti", "en"] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 text-sm rounded ${
                language === lang ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Font size and other controls */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm">Font:</label>
            <input
              type="range"
              min="2"
              max="6"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-20"
            />
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 rounded text-sm ${
              autoScroll ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {autoScroll ? "Auto: ON" : "Auto: OFF"}
          </button>
        </div>
      </div>
    </>
  );
}
