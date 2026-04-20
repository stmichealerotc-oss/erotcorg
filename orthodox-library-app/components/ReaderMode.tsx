/**
 * Reader Mode
 * Sequential view of liturgical content with language selection
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { LiturgicalBlock as LiturgicalBlockType, Language, Book } from "@/models/types";
import LiturgicalBlock from "./LiturgicalBlock";
import { languageNames } from "@/lib/utils";

interface ReaderModeProps {
  book: Book;
  blocks: LiturgicalBlockType[];
}

export default function ReaderMode({ book, blocks }: ReaderModeProps) {
  const [language, setLanguage] = useState<Language>("en");

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 sticky top-0 bg-white z-10 pb-4 border-b">
        <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
        <p className="text-gray-600 mb-4">{book.description}</p>

        {/* Language Selector */}
        <div className="flex gap-2">
          {book.languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-2 rounded font-semibold transition ${
                language === lang
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {languageNames[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        {blocks.map((block) => (
          <LiturgicalBlock
            key={block.id}
            block={block}
            language={language}
            displayMode="reader"
            showRole={true}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 py-8 border-t text-center text-gray-500 text-sm">
        <p>End of {book.title}</p>
      </div>
    </div>
  );
}
