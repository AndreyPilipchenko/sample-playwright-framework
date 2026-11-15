/** `text` as a regular-expression source that matches it literally: for locators and URL checks built around a value. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A pattern matching an element whose whole text is `text`, ignoring surrounding whitespace: for a `{ hasText }`
 * filter that picks one row, card or message out of a located collection, where a plain string would also match
 * longer texts that contain it.
 */
export function exactText(text: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`);
}
