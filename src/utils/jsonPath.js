// Minimal JSONPath subset parser: identifiers, [index], ['quoted keys'], optional $.
// Not supported: wildcards, recursive descent, filters, slices.

const isIdentStart = (ch) => /[A-Za-z_$]/.test(ch);
const isIdentPart = (ch) => /[A-Za-z0-9_$]/.test(ch);

export function parseJsonPath(path) {
  const input = (path || '').trim();
  if (input.length === 0) return { tokens: [], error: '' };

  let i = 0;
  const tokens = [];
  const skipWs = () => { while (i < input.length && /\s/.test(input[i])) i++; };

  const parseIdentifier = () => {
    if (!isIdentStart(input[i])) return null;
    let start = i; i++;
    while (i < input.length && isIdentPart(input[i])) i++;
    return input.slice(start, i);
  };

  const parseQuotedKey = () => {
    const quote = input[i];
    if (quote !== "'" && quote !== '"') return { err: "Expected quote in bracket key" };
    i++;
    let s = '';
    while (i < input.length) {
      const ch = input[i];
      if (ch === '\\') {
        if (i + 1 >= input.length) return { err: 'Invalid escape' };
        s += input[i + 1]; i += 2;
      } else if (ch === quote) {
        i++; return { key: s };
      } else { s += ch; i++; }
    }
    return { err: 'Unterminated string in bracket key' };
  };

  const parseBracket = () => {
    i++; skipWs();
    if (i >= input.length) return { err: 'Unclosed bracket' };

    if (input[i] === "'" || input[i] === '"') {
      const { key, err } = parseQuotedKey();
      if (err) return { err };
      skipWs(); if (input[i] !== ']') return { err: "Missing closing ]" }; i++;
      return { token: key };
    }

    let start = i;
    while (i < input.length && /[0-9]/.test(input[i])) i++;
    if (start === i) return { err: 'Expected index or quoted key in brackets' };
    const numStr = input.slice(start, i);
    skipWs(); if (input[i] !== ']') return { err: "Missing closing ]" }; i++;
    return { token: Number(numStr) };
  };

  if (input[i] === '$') { i++; if (input[i] === '.') i++; }
  skipWs();

  while (i < input.length) {
    if (input[i] === '.') {
      i++; skipWs();
      const id = parseIdentifier();
      if (id == null) return { tokens: [], error: 'Invalid identifier after dot' };
      tokens.push(id); skipWs();
    } else if (input[i] === '[') {
      const { token, err } = parseBracket();
      if (err) return { tokens: [], error: err };
      tokens.push(token); skipWs();
      if (input[i] === '.') { i++; skipWs(); }
    } else {
      const id = parseIdentifier();
      if (id == null) return { tokens: [], error: `Unexpected character '${input[i]}'` };
      tokens.push(id); skipWs();
      if (input[i] === '.') { i++; skipWs(); }
    }
  }

  return { tokens, error: '' };
}
