// Minimal spreadsheet formula evaluator.
// Supports: cell refs (A1), ranges (A1:B5), arithmetic (+ - * / %), parens,
// numbers, strings ("..."), and functions: SUM, AVERAGE/AVG, MIN, MAX, COUNT, IF, CONCAT.

export function colLetterToIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function indexToColLetter(idx) {
  let n = idx + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function cellKey(row, col) {
  return `${indexToColLetter(col)}${row + 1}`;
}

export function parseRef(ref) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  return { col: colLetterToIndex(m[1]), row: parseInt(m[2], 10) - 1 };
}

function expandRange(a, b) {
  const A = parseRef(a);
  const B = parseRef(b);
  if (!A || !B) return [];
  const r1 = Math.min(A.row, B.row), r2 = Math.max(A.row, B.row);
  const c1 = Math.min(A.col, B.col), c2 = Math.max(A.col, B.col);
  const out = [];
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++) out.push(cellKey(r, c));
  return out;
}

const FUNCS = {
  SUM: (xs) => xs.reduce((a, b) => a + (Number(b) || 0), 0),
  AVG: (xs) => (xs.length ? FUNCS.SUM(xs) / xs.filter((v) => v !== '' && v != null).length : 0),
  AVERAGE: (xs) => FUNCS.AVG(xs),
  MIN: (xs) => Math.min(...xs.map(Number).filter((n) => !isNaN(n))),
  MAX: (xs) => Math.max(...xs.map(Number).filter((n) => !isNaN(n))),
  COUNT: (xs) => xs.filter((v) => v !== '' && v != null && !isNaN(Number(v))).length,
  IF: (xs) => (xs[0] ? xs[1] : xs[2]),
  CONCAT: (xs) => xs.map((v) => (v == null ? '' : String(v))).join(''),
};

// Evaluate a single cell's raw value into its computed value.
export function evalCell(rawValue, cells, visiting = new Set(), keyForThis = null) {
  if (rawValue == null || rawValue === '') return '';
  const s = String(rawValue);
  if (s[0] !== '=') {
    const n = Number(s);
    return s.trim() !== '' && !isNaN(n) ? n : s;
  }
  if (keyForThis && visiting.has(keyForThis)) return '#CIRC';
  if (keyForThis) visiting.add(keyForThis);
  try {
    return evalExpr(s.slice(1), cells, visiting);
  } catch (e) {
    return '#ERR';
  } finally {
    if (keyForThis) visiting.delete(keyForThis);
  }
}

function evalExpr(expr, cells, visiting) {
  // Replace ranges A1:B2 inside function args with comma-separated refs.
  // Then transform into a JS expression using a values map and call FUNCS.
  const refValues = {};

  function refValue(ref) {
    const r = parseRef(ref);
    if (!r) return 0;
    const v = evalCell(cells[ref], cells, visiting, ref);
    refValues[ref] = v;
    return v;
  }

  // Tokenize and transform.
  let out = '';
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    // String literal
    if (ch === '"') {
      let j = i + 1;
      while (j < expr.length && expr[j] !== '"') j++;
      out += JSON.stringify(expr.slice(i + 1, j));
      i = j + 1;
      continue;
    }
    // Function or cell ref or range
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++;
      const word = expr.slice(i, j);
      // Function call?
      if (expr[j] === '(') {
        const fnName = word.toUpperCase();
        const { args, end } = readArgs(expr, j);
        const evaledArgs = args.flatMap((a) => evalArg(a, cells, visiting));
        const fn = FUNCS[fnName];
        const result = fn ? fn(evaledArgs) : NaN;
        out += JSON.stringify(result);
        i = end;
        continue;
      }
      // Cell ref like A1
      if (/^[A-Za-z]+\d+$/.test(word)) {
        const v = refValue(word.toUpperCase());
        out += typeof v === 'number' ? String(v) : JSON.stringify(v);
        i = j;
        continue;
      }
      // Bare word -> 0
      out += '0';
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${out});`)();
  return result;
}

function readArgs(expr, openParenIdx) {
  let depth = 0;
  const args = [];
  let buf = '';
  let i = openParenIdx;
  for (; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') { depth++; if (depth === 1) continue; }
    if (ch === ')') { depth--; if (depth === 0) { if (buf.trim()) args.push(buf); return { args, end: i + 1 }; } }
    if (ch === ',' && depth === 1) { args.push(buf); buf = ''; continue; }
    buf += ch;
  }
  return { args, end: i };
}

function evalArg(arg, cells, visiting) {
  const trimmed = arg.trim();
  // Range A1:B2
  const rng = /^([A-Za-z]+\d+):([A-Za-z]+\d+)$/.exec(trimmed);
  if (rng) {
    return expandRange(rng[1].toUpperCase(), rng[2].toUpperCase()).map((k) =>
      evalCell(cells[k], cells, visiting, k)
    );
  }
  // Otherwise evaluate as a sub-expression
  return [evalExpr(trimmed, cells, visiting)];
}
