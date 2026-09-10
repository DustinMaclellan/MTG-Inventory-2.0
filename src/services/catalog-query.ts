export type CatalogSearchParts = {
  name: string;
  setCode?: string;
  collectorNumber?: string;
};

export type CatalogSet = {
  code: string;
  name: string;
};

const SET_OP = /\b(?:set|e):([a-z0-9]+)/i;
const NUMBER_OP = /\b(?:number|cn):([a-z0-9-]+)/i;
const HASH_NUMBER = /#([a-z0-9-]+)/i;
const COLLECTOR_TOKEN = /^\d+[a-z]?$/i;
const SET_TOKEN = /^(?=.*[a-z])[a-z0-9]{2,5}$/i;
const ARENA = /^(.*?)\s+\(([a-z0-9]{2,8})\)(?:\s+([0-9a-z-]+))?$/i;

function fold(token: string) {
  return token.toLocaleLowerCase();
}

function tokenize(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function sameWord(left: string, right: string) {
  const a = fold(left);
  const b = fold(right);
  if (a === b) return true;
  return a.length > 2 && b.length > 2 && (a + "s" === b || b + "s" === a);
}

export function findSetSpan(tokens: string[], sets: CatalogSet[]) {
  let best: { index: number; length: number; code: string } | null = null;

  for (const set of sets) {
    const nameTokens = tokenize(set.name);
    if (nameTokens.length === 0) continue;
    for (let index = 0; index <= tokens.length - nameTokens.length; index += 1) {
      if (!nameTokens.every((word, offset) => sameWord(tokens[index + offset] ?? "", word))) {
        continue;
      }
      if (!best || nameTokens.length > best.length) {
        best = { index, length: nameTokens.length, code: set.code };
      }
    }

    const code = fold(set.code);
    if (code.length < 2) continue;
    for (let index = 0; index < tokens.length; index += 1) {
      if (fold(tokens[index] ?? "") !== code) continue;
      if (!best || best.length < 1) {
        best = { index, length: 1, code: set.code };
      }
    }
  }

  return best;
}

function takeCollector(tokens: string[], already?: string) {
  if (already || tokens.length === 0) return { tokens, collectorNumber: already };
  if (!COLLECTOR_TOKEN.test(tokens[tokens.length - 1] ?? "")) {
    return { tokens, collectorNumber: already };
  }
  const collectorNumber = tokens[tokens.length - 1];
  return { tokens: tokens.slice(0, -1), collectorNumber };
}

export function parseCatalogQuery(rawQuery: string, sets: CatalogSet[] = []): CatalogSearchParts {
  let rest = rawQuery.trim().replace(/\s+/g, " ");
  let setCode: string | undefined;
  let collectorNumber: string | undefined;

  const setOp = rest.match(SET_OP);
  if (setOp) {
    setCode = setOp[1];
    rest = rest.replace(setOp[0], " ").replace(/\s+/g, " ").trim();
  }
  const numberOp = rest.match(NUMBER_OP) ?? rest.match(HASH_NUMBER);
  if (numberOp) {
    collectorNumber = numberOp[1];
    rest = rest.replace(numberOp[0], " ").replace(/\s+/g, " ").trim();
  }

  const arena = rest.match(ARENA);
  if (arena?.[1]?.trim()) {
    return {
      name: arena[1].trim(),
      setCode: setCode ?? arena[2],
      collectorNumber: collectorNumber ?? arena[3],
    };
  }

  const tokens = rest.split(" ").filter(Boolean);
  if (!setCode && sets.length > 0) {
    const span = findSetSpan(tokens, sets);
    if (span) {
      const before = tokens.slice(0, span.index);
      const after = tokens.slice(span.index + span.length);
      const trailing = takeCollector(after, collectorNumber);
      const leading = takeCollector(before, trailing.collectorNumber);
      return {
        name: [...leading.tokens, ...trailing.tokens].join(" "),
        setCode: span.code,
        collectorNumber: leading.collectorNumber,
      };
    }
  }

  let leftover = tokens;
  if (leftover.length >= 2 && !collectorNumber && COLLECTOR_TOKEN.test(leftover[leftover.length - 1] ?? "")) {
    collectorNumber = leftover.pop();
  }
  if (leftover.length === 1 && !collectorNumber && COLLECTOR_TOKEN.test(leftover[0] ?? "")) {
    collectorNumber = leftover.pop();
  }
  if (!setCode && leftover.length >= 1 && SET_TOKEN.test(leftover[leftover.length - 1] ?? "")) {
    setCode = leftover.pop();
  }

  return {
    name: leftover.join(" "),
    setCode,
    collectorNumber,
  };
}

export function restoreRejectedSet(parts: CatalogSearchParts): CatalogSearchParts {
  if (!parts.setCode) return parts;
  return {
    name: [parts.name, parts.setCode].filter(Boolean).join(" ").trim(),
    collectorNumber: parts.collectorNumber,
  };
}

export function scryfallCatalogQuery(parts: CatalogSearchParts) {
  const clauses = ["game:paper"];
  if (parts.name) clauses.unshift(`!"${parts.name.replaceAll('"', "")}"`);
  if (parts.setCode) clauses.push(`set:${parts.setCode}`);
  if (parts.collectorNumber) clauses.push(`cn:${parts.collectorNumber}`);
  return clauses.join(" ");
}
