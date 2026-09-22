import { compact, isSubsequence, tokens } from "./normalize";
import type { CatalogApp, MatchHit, UserAlias } from "./types";

const ALIAS_EXACT = 50_000;
const ALIAS_PREFIX = 40_000;
const NAME_PREFIX = 30_000;
const WORD_PREFIX = 22_000;
const PACKAGE_PREFIX = 18_000;
const CONTAINS = 12_000;
const SUBSEQ = 6_000;

export function resolveAliasTarget(
  query: string,
  aliases: UserAlias[],
): string | null {
  const q = compact(query);
  if (!q) return null;
  const hit = aliases.find((a) => compact(a.alias) === q);
  return hit ? hit.target : null;
}

export function scoreApp(query: string, app: CatalogApp): MatchHit | null {
  const q = compact(query);
  if (!q) return null;

  const nameC = compact(app.name);
  const aliasCompacts = app.aliases.map(compact).filter(Boolean);
  const words = tokens(app.name);
  const pkg = app.androidPackage ? compact(app.androidPackage) : "";
  const pkgTail = app.androidPackage
    ? compact(app.androidPackage.split(".").pop() ?? "")
    : "";

  let score = -1;
  let reason: MatchHit["reason"] = "subseq";

  for (const a of aliasCompacts) {
    if (a === q) {
      score = Math.max(score, ALIAS_EXACT);
      reason = "alias";
    } else if (a.startsWith(q)) {
      const tightness = q.length / a.length;
      score = Math.max(score, ALIAS_PREFIX + tightness * 800);
      if (reason !== "alias") reason = "alias";
    }
  }

  if (nameC.startsWith(q)) {
    const tightness = q.length / Math.max(nameC.length, 1);
    const prefixScore = NAME_PREFIX + tightness * 900;
    if (prefixScore > score) {
      score = prefixScore;
      reason = "prefix";
    }
  }

  for (const w of words) {
    const wc = compact(w);
    if (wc.startsWith(q) && wc !== nameC) {
      const tightness = q.length / Math.max(wc.length, 1);
      const wordScore = WORD_PREFIX + tightness * 500;
      if (wordScore > score) {
        score = wordScore;
        reason = "word";
      }
    }
  }

  if (pkgTail.startsWith(q) || (pkg && pkg.startsWith(q))) {
    const packScore = PACKAGE_PREFIX + (q.length / Math.max(pkgTail.length, 1)) * 400;
    if (packScore > score) {
      score = packScore;
      reason = "package";
    }
  }

  if (nameC.includes(q) && !nameC.startsWith(q) && q.length >= 3) {
    const containsScore = CONTAINS - nameC.indexOf(q) * 8;
    if (containsScore > score) {
      score = containsScore;
      reason = "contains";
    }
  }

  for (const a of aliasCompacts) {
    if (q.length >= 3 && a.includes(q) && !a.startsWith(q) && a !== q) {
      const containsScore = CONTAINS - 40;
      if (containsScore > score) {
        score = containsScore;
        reason = "contains";
      }
    }
  }

  if (score < 0 && q.length >= 3 && isSubsequence(q, nameC)) {
    score = SUBSEQ - (nameC.length - q.length);
    reason = "subseq";
  }

  if (score < 0) return null;

  score += app.weight * 12;
  score -= Math.max(0, nameC.length - q.length) * 0.35;

  return { app, score, reason };
}

export function rankApps(
  query: string,
  apps: CatalogApp[],
  usage: Record<string, number>,
  limit = 8,
): MatchHit[] {
  const q = compact(query);
  if (!q) return [];

  const hits: MatchHit[] = [];
  for (const app of apps) {
    const hit = scoreApp(query, app);
    if (!hit) continue;
    const used = usage[app.id] ?? 0;
    hit.score += Math.min(used, 80) * 18;
    hits.push(hit);
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.app.weight !== a.app.weight) return b.app.weight - a.app.weight;
    return a.app.name.length - b.app.name.length;
  });

  return hits.slice(0, limit);
}

export function pickLaunch(hits: MatchHit[]): MatchHit | null {
  if (hits.length === 0) return null;
  return hits[0] ?? null;
}
