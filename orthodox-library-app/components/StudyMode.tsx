/**
 * Study Mode
 * 3-column parallel view: Ge'ez | Tigrinya | English
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { LiturgicalBlock as LiturgicalBlockType, Book } from "@/models/types";
import { getTranslation, getRoleColor, styleToClasses } from "@/lib/utils";

interface StudyModeProps {
  book: Book;
  blocks: LiturgicalBlockType[];
}

export default function StudyMode({ book, blocks }: StudyModeProps) {
  const [stacked, setStacked] = useState(false);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 bg-gray-50 p-6 border-b sticky top-0 z-10">
        <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
        <p className="text-gray-600">Study Mode - Compare Translations</p>
      </div>

      {/* View selector */}
      <div className="flex gap-4 px-4 mb-4 sticky top-24 z-10 bg-white items-center">
        <label className="font-semibold">View:</label>
        <button
          onClick={() => setStacked(false)}
          className={`px-3 py-1 rounded ${
            !stacked ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Parallel
        </button>
        <button
          onClick={() => setStacked(true)}
          className={`px-3 py-1 rounded ${
            stacked ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Stacked
        </button>
      </div>

      {stacked ? (
        <div className="space-y-6 p-4">
          {blocks.map((block) => (
            <div key={block.id} className="p-4 border-b">
              <p className="text-xs uppercase text-gray-500 mb-2 font-semibold">
                {block.role || "—"}
              </p>
              <p className="font-serif text-sm leading-relaxed">
                {getTranslation(block.translations as Record<string, string | undefined>, "gez", "[N/A]")}
              </p>
              <p className="font-serif text-sm leading-relaxed">
                {getTranslation(block.translations as Record<string, string | undefined>, "ti", "[N/A]")}
              </p>
              <p className="font-serif text-sm leading-relaxed">
                {getTranslation(block.translations as Record<string, string | undefined>, "en", "[N/A]")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        // parallel view
        <>
          {/* Column Headers */}
          <div className="grid grid-cols-3 gap-4 px-4 mb-4 sticky top-24 z-10 bg-white">
            <div className="font-bold text-center pb-2 border-b-2 border-amber-700">Ge&apos;ez</div>
            <div className="font-bold text-center pb-2 border-b-2 border-orange-700">Tigrinya</div>
            <div className="font-bold text-center pb-2 border-b-2 border-blue-700">English</div>
          </div>

          {/* Blocks in parallel columns */}
          <div className="space-y-8 p-4">
            {blocks.map((block) => (
              <div key={block.id} className="grid grid-cols-3 gap-4">
                {/* Ge'ez Column */}
                <div className="p-3 border-l-4 border-amber-700 bg-amber-50">
                  <p className="text-xs uppercase text-gray-500 mb-2 font-semibold">
                    {block.role || "—"}
                  </p>
                  <p
                    className={`font-serif text-sm leading-relaxed ${
                      block.isRubric ? "italic text-red-900" : ""
                    }`}
                  >
                    {getTranslation(block.translations as Record<string, string | undefined>, "gez", "[N/A]")}
                  </p>
                </div>

                {/* Tigrinya Column */}
                <div className="p-3 border-l-4 border-orange-700 bg-orange-50">
                  <p className="text-xs uppercase text-gray-500 mb-2 font-semibold">
                    {block.role || "—"}
                  </p>
                  <p
                    className={`font-serif text-sm leading-relaxed ${
                      block.isRubric ? "italic text-red-900" : ""
                    }`}
                  >
                    {getTranslation(block.translations as Record<string, string | undefined>, "ti", "[N/A]")}
                  </p>
                </div>

                {/* English Column */}
                <div className="p-3 border-l-4 border-blue-700 bg-blue-50">
                  <p className="text-xs uppercase text-gray-500 mb-2 font-semibold">
                    {block.role || "—"}
                  </p>
                  <p
                    className={`font-serif text-sm leading-relaxed ${
                      block.isRubric ? "italic text-red-900" : ""
                    }`}
                  >
                    {getTranslation(block.translations as Record<string, string | undefined>, "en", "[N/A]")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-12 py-8 border-t text-center text-gray-500 text-sm">
        <p>End of study session</p>
      </div>
    </div>
  );
}
