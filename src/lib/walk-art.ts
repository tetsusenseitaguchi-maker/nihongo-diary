import { readdirSync } from "fs";
import path from "path";

/**
 * Which walk destinations have a picture, found by looking in public/walk/.
 *
 * Dropping genkan.png — or later genkan.svg — into that folder is the whole of
 * adding one: no list to edit, no build step. A destination without a file is
 * drawn as a plain signpost instead, which is also what everything falls back
 * to if the folder cannot be read at all, so the failure is cosmetic.
 *
 * ⚠️ On Vercel, public/ is served from the CDN and is NOT in the function's
 * filesystem by default. next.config.ts lists public/walk under
 * outputFileTracingIncludes for /dashboard so that this readdir sees it.
 * Remove that and every destination silently becomes a signpost.
 *
 * Read once per server instance in production. In development it is read on
 * every call so a newly added file shows up without a restart.
 */

/** In order of preference when the same slug exists twice. */
const WALK_ART_EXTS = [".svg", ".webp", ".png"] as const;

let cache: Map<string, string> | null = null;

function scan(): Map<string, string> {
  const found = new Map<string, string>();
  let files: string[] = [];
  try {
    files = readdirSync(path.join(process.cwd(), "public", "walk"));
  } catch {
    return found;
  }
  for (const ext of [...WALK_ART_EXTS].reverse()) {
    for (const f of files) {
      if (f.toLowerCase().endsWith(ext)) found.set(f.slice(0, -ext.length), `/walk/${f}`);
    }
  }
  return found;
}

/** The public URL of a destination's picture, or null for a signpost. */
export function walkArtFor(slug: string): string | null {
  if (process.env.NODE_ENV !== "production") return scan().get(slug) ?? null;
  cache ??= scan();
  return cache.get(slug) ?? null;
}
