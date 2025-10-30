// Build a React Flow graph from JSON and compute a tidy tree layout.

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isArray = Array.isArray;

export function tokensToDisplayPath(tokens) {
  const isIdentifier = (s) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  let s = '$';
  for (const t of tokens) {
    if (typeof t === 'number') s += `[${t}]`;
    else if (isIdentifier(t)) s += `.${t}`;
    else s += `['${esc(t)}']`;
  }
  return s;
}

function previewPrimitive(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${v.length > 40 ? v.slice(0, 37) + '…' : v}"`;
  return String(v);
}

function makeLabel(kind, key, isRoot, isArrayElement) {
  if (kind === 'object') {
    if (isRoot) return '$';
    if (isArrayElement) return `[${key}]`;
    return String(key);
  }
  if (kind === 'array') {
    if (isRoot) return '[]';
    if (isArrayElement) return `[${key}][]`;
    return `${String(key)}[]`;
  }
  if (isRoot) return `$:`;
  if (isArrayElement) return `[${key}]:`;
  return `${String(key)}:`;
}

function buildTree(value, parentTokens = [], key = undefined) {
  let kind = 'primitive';
  if (isArray(value)) kind = 'array';
  else if (isObject(value)) kind = 'object';

  const isRoot = key === undefined;
  const isArrayElement = typeof key === 'number';
  const tokens = isRoot ? [] : [...parentTokens, key];
  const pathDisplay = tokensToDisplayPath(tokens);

  const node = {
    id: pathDisplay,
    kind,
    pathDisplay,
    tokens,
    key,
    isRoot,
    label: '',
    valuePreview: undefined,
    children: []
  };

  if (kind === 'primitive') {
    node.label = makeLabel(kind, key, isRoot, isArrayElement);
    node.valuePreview = previewPrimitive(value);
  } else if (kind === 'object') {
    node.label = makeLabel(kind, key, isRoot, isArrayElement);
    for (const k of Object.keys(value)) node.children.push(buildTree(value[k], tokens, k));
  } else if (kind === 'array') {
    node.label = makeLabel(kind, key, isRoot, isArrayElement);
    for (let i = 0; i < value.length; i++) node.children.push(buildTree(value[i], tokens, i));
  }

  return node;
}

// Simple tidy tree layout
function layoutTree(root, xStep = 260, yStep = 90) {
  let nextY = 0;
  function assign(node, depth) {
    node.depth = depth;
    if (!node.children.length) {
      node.y = nextY * yStep; nextY += 1;
      node.x = depth * xStep;
      return { minY: node.y, maxY: node.y };
    }
    let minY = Infinity, maxY = -Infinity;
    for (const c of node.children) {
      const box = assign(c, depth + 1);
      minY = Math.min(minY, box.minY);
      maxY = Math.max(maxY, box.maxY);
    }
    node.y = (minY + maxY) / 2;
    node.x = depth * xStep;
    return { minY, maxY };
  }
  assign(root, 0);
}

function flattenToFlow(root) {
  const nodes = [];
  const edges = [];
  const tokenIndex = new Map();

  function walk(n) {
    tokenIndex.set(JSON.stringify(n.tokens || []), n.id);
    nodes.push({
      id: n.id,
      type: 'jsonNode',
      position: { x: n.x || 0, y: n.y || 0 },
      data: {
        kind: n.kind,
        label: n.kind === 'primitive' ? `${n.label} ${n.valuePreview}` : n.label,
        valuePreview: n.kind === 'primitive' ? n.valuePreview : undefined,
        pathDisplay: n.pathDisplay,
        isMatch: false
      }
    });
    for (const c of n.children) {
      edges.push({ id: `e-${n.id}->${c.id}`, source: n.id, target: c.id });
      walk(c);
    }
  }
  walk(root);
  return { nodes, edges, tokenIndex };
}

export function buildFlowFromJson(json) {
  const root = buildTree(json);
  layoutTree(root);
  return flattenToFlow(root);
}