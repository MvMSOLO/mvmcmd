const MARK = /[™®©]/g;
const SPLIT = /[^a-z0-9а-яёўқғҳ]+/gi;

export function fold(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(MARK, " ");
}

export function tokens(input: string): string[] {
  return fold(input)
    .split(SPLIT)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function compact(input: string): string {
  return tokens(input).join("");
}

export function isSubsequence(query: string, host: string): boolean {
  let i = 0;
  for (let h = 0; h < host.length && i < query.length; h++) {
    if (host[h] === query[i]) i++;
  }
  return i === query.length;
}
