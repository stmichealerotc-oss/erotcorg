/**
 * LiturgicalBlock Component
 * Displays a single liturgical block with role-based styling
 */

"use client";

import { LiturgicalBlock, Language } from "@/models/types";
import { getRoleColor, styleToClasses, getTranslation } from "@/lib/utils";

interface LiturgicalBlockProps {
  block: LiturgicalBlock;
  language: Language;
  displayMode?: "reader" | "study" | "projector";
  showRole?: boolean;
}

export default function LiturgicalBlockComponent({
  block,
  language,
  displayMode = "reader",
  showRole = true,
}: LiturgicalBlockProps) {
  const text = getTranslation(block.translations as Record<string, string | undefined>, language);
  const roleColor = getRoleColor(block.role);
  const customStyles = "";

  if (displayMode === "projector") {
    // Large text, full screen
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center px-8">
          {showRole && block.role && (
            <p className="text-sm uppercase tracking-widest mb-4 text-gray-400">{block.role}</p>
          )}
          <p className={`text-6xl leading-relaxed font-serif ${roleColor} ${customStyles}`}>
            {text}
          </p>
          {block.isRubric && (
            <p className="text-xs mt-8 text-gray-500 italic">[Rubric instruction]</p>
          )}
        </div>
      </div>
    );
  }

  // Reader or Study mode
  return (
    <div
      className={`my-4 p-4 border-l-4 ${
        block.isRubric ? "border-red-700 bg-red-50" : "border-transparent"
      }`}
    >
      {block.role && showRole && (
        <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${roleColor}`}>
          {block.role}
        </p>
      )}
      <p className={`font-serif text-lg leading-relaxed ${roleColor} ${customStyles}`}>
        {text}
      </p>
      {block.isRubric && <p className="text-xs mt-2 text-gray-600 italic">[Instruction]</p>}
    </div>
  );
}
