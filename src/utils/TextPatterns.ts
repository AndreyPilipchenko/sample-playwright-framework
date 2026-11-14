/** `text` as a regular-expression source that matches it literally: for locators and URL checks built around a value. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
