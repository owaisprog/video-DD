// src/utils/extractMessageFromHtml.ts
export const extractMessageFromHtml = (html: string) => {
  const match = html.match(/Error:\s*([^<\n\r]+?)(?:<br|<\/pre|$)/i);
  if (match?.[1]) return match[1].trim();

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match2 = text.match(/Error:\s*(.+?)(?:\s+at\s+|$)/i);
  if (match2?.[1]) return match2[1].trim();

  return "Something went wrong. Please try again.";
};
