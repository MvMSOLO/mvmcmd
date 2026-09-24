import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];

export async function resolve(specifier, context, nextResolve) {
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  const absolute = specifier.startsWith("file:");
  if (relative || absolute) {
    try {
      const base = new URL(specifier, context.parentURL);
      if (!base.pathname.match(/\.[a-z0-9]+$/i)) {
        for (const ext of EXTENSIONS) {
          const candidate = new URL(base.href + ext);
          try {
            await access(fileURLToPath(candidate));
            return { url: candidate.href, shortCircuit: true };
          } catch {}
        }
      }
    } catch {}
  }
  return nextResolve(specifier, context);
}
