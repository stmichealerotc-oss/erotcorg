/**
 * Utility functions for the Orthodox Library
 */

import { Role, Language, TextStyle } from "@/models/types";

/**
 * Get display color for a role
 */
export function getRoleColor(role: Role | undefined): string {
  const colors: Record<Role, string> = {
    priest: "text-role-priest",
    deacon: "text-role-deacon",
    choir: "text-role-choir",
    reader: "text-role-reader",
    people: "text-role-choir",
    bishop: "text-role-priest",
    "": "",
  };
  return role ? colors[role] : "";
}

/**
 * Get display background color for a role (for projector mode)
 */
export function getRoleBackgroundColor(role: Role | undefined): string {
  const colors: Record<Role, string> = {
    priest: "bg-yellow-600",
    deacon: "bg-red-600",
    choir: "bg-blue-600",
    reader: "bg-green-600",
    people: "bg-blue-600",
    bishop: "bg-yellow-600",
    "": "bg-gray-900",
  };
  return role ? colors[role] : "bg-gray-900";
}

/**
 * Convert TextStyle to Tailwind classes
 */
export function styleToClasses(style?: TextStyle): string {
  const classes: string[] = [];

  if (style?.bold) classes.push("font-bold");
  if (style?.italic) classes.push("italic");

  if (style?.fontSize) {
    const sizes: Record<string, string> = {
      small: "text-sm",
      normal: "text-base",
      large: "text-lg",
      xlarge: "text-3xl",
    };
    classes.push(sizes[style.fontSize] || "text-base");
  }

  if (style?.color) {
    const colorMap: Record<string, string> = {
      gold: "text-yellow-500",
      red: "text-red-600",
      blue: "text-blue-600",
      green: "text-green-600",
      darkred: "text-red-900",
    };
    classes.push(colorMap[style.color] || "");
  }

  return classes.join(" ");
}

/**
 * Get translated text or fallback
 */
export function getTranslation(
  translations: Record<string, string | undefined> | undefined,
  language: Language,
  fallback = ""
): string {
  if (!translations) return fallback;
  return translations[language] || translations["en"] || fallback;
}

/**
 * Language display names
 */
export const languageNames: Record<Language, string> = {
  gez: "Ge'ez",
  ti: "Tigrinya",
  en: "English",
};

/**
 * Role display names
 */
export const roleNames: Record<Role, string> = {
  priest: "Priest",
  deacon: "Deacon",
  choir: "Choir",
  reader: "Reader",
  people: "People",
  bishop: "Bishop",
  "": "",
};
