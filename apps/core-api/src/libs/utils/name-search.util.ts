/**
 * «علی رضایی» matches someone whose first name is علی and last name رضایی,
 * though neither column holds the whole phrase: every word has to hit the
 * display name, the first name or the last name.
 */
export function nameWords(text: string): object[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const like = { $ilike: `%${word}%` };
      return {
        $or: [{ displayName: like }, { firstName: like }, { lastName: like }],
      };
    });
}
