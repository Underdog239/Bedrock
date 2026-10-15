/**
 * Reads a JSON response without ever surfacing a raw parse error.
 *
 * A dev server restart, a dropped connection, or a proxy hiccup can produce an
 * empty or HTML body. Calling `res.json()` on those throws
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input",
 * which callers cannot distinguish from a real protocol failure. This returns
 * `null` instead so every caller can fall back gracefully.
 */
export async function readJson<T = any>(res: Response): Promise<T | null> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return null;
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}