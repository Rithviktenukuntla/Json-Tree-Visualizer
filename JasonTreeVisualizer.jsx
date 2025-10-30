import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import JasonNode from './JasonNode.jsx';
import { buildFlowFromJson } from '../utils/jsonGraph.js';
import { parseJsonPath } from '../utils/jsonPath.js';
import { toPng } from 'html-to-image';

const SAMPLE_JSON = `{
  "user": {
    "id": 123,
    "name": "Ada Lovelace",
    "address": { "city": "London", "zip": "WC2N", "active": true }
  },
  "items": [
    { "name": "Laptop", "price": 1299.99, "tags": ["electronics", "work"] },
    { "name": "Notebook", "price": 4.5, "tags": [] },
    "misc"
  ],
  "settings": { "theme": "dark", "notifications": null }
}`;

const nodeTypes = { jsonNode: JasonNode };

const JasonTreeVisualizer = forwardRef(function JasonTreeVisualizer({ theme = 'dark' }, ref) {
  // Full graph (for expand/collapse + search)
  const [allNodes, setAllNodes] = useState([]);
  const [allEdges, setAllEdges] = useState([]);
  const [tokenIndex, setTokenIndex] = useState(new Map()); // tokenKey -> nodeId
  const [idToNodeMap, setIdToNodeMap] = useState(new Map()); // nodeId -> node

  // Visible graph
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // UI
  const [input, setInput] = useState(SAMPLE_JSON);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchMsg, setSearchMsg] = useState('');
  const [toast, setToast] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const rfInstanceRef = useRef(null);
  const flowWrapperRef = useRef(null);
  const toastTimer = useRef(null);
  const searchInputRef = useRef(null);

  const showToast = (msg, ms = 1100) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), ms);
  };

  const visualize = useCallback(() => {
    setError('');
    setSearchMsg('');
    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      setError('Invalid JSON: ' + (e?.message || 'Parse error'));
      return;
    }

    const { nodes: builtNodes, edges: builtEdges, tokenIndex: idx } = buildFlowFromJson(parsed);
    setAllNodes(builtNodes);
    setAllEdges(builtEdges);
    setTokenIndex(idx);
    setIdToNodeMap(new Map(builtNodes.map(n => [n.id, n])));

    // Start expanded
    setNodes(builtNodes);
    setEdges(builtEdges);
    setCollapsed(false);

    setTimeout(() => {
      try {
        rfInstanceRef.current?.fitView({ padding: 0.2, duration: 500 });
      } catch {}
    }, 0);
  }, [input]);

  useEffect(() => {
    visualize();
    return () => toastTimer.current && clearTimeout(toastTimer.current);
  }, []); // eslint-disable-line

  const collapseAll = useCallback(() => {
    if (!allNodes.length) return;
    const root =
      allNodes.find(n => n.id === '$') || allNodes[0]; // root has id '$'
    setNodes([root]);
    setEdges([]);
    setCollapsed(true);
    // clear any match outline
    setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, isMatch: false } })));
  }, [allNodes]);

  const expandAll = useCallback(() => {
    if (!allNodes.length) return;
    setNodes(allNodes);
    setEdges(allEdges);
    setCollapsed(false);
  }, [allNodes, allEdges]);

  const handleSearch = useCallback(() => {
    setSearchMsg('');
    if (!allNodes.length) return;

    const { tokens, error: parseErr } = parseJsonPath(search);
    if (parseErr) {
      setSearchMsg(parseErr);
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isMatch: false } })));
      return;
    }
    const tokenKey = JSON.stringify(tokens || []);
    const nodeId = tokenIndex.get(tokenKey);

    if (!nodeId) {
      setSearchMsg('No match found');
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isMatch: false } })));
      return;
    }

    // Ensure node is visible if currently collapsed
    if (collapsed) expandAll();

    // Highlight match
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isMatch: n.id === nodeId } })));

    // Center on the node
    const node = idToNodeMap.get(nodeId);
    if (node) {
      const { x, y } = node.position;
      try {
        // if we just expanded, wait a tick before centering
        setTimeout(() => rfInstanceRef.current?.setCenter(x, y, { zoom: 1.25, duration: 800 }), collapsed ? 60 : 0);
      } catch {}
      setSearchMsg('Match found');
    } else {
      setSearchMsg('Match found (could not center)');
    }
  }, [search, tokenIndex, idToNodeMap, collapsed, expandAll]);

  const onKeyDownSearch = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearAll = useCallback(() => {
    setInput('');
    setError('');
    setSearch('');
    setSearchMsg('');
    setAllNodes([]);
    setAllEdges([]);
    setNodes([]);
    setEdges([]);
    setTokenIndex(new Map());
    setIdToNodeMap(new Map());
    setCollapsed(false);
    try {
      rfInstanceRef.current?.setViewport({ x: 0, y: 0, zoom: 1 });
    } catch {}
  }, []);

  const onNodeClick = useCallback(async (evt, node) => {
    const path = node?.data?.pathDisplay || node?.id;
    if (!path) return;
    try {
      await navigator.clipboard.writeText(path);
      showToast(`Copied: ${path}`);
    } catch {
      showToast('Copy failed');
    }
    setSearch(path);
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isMatch: n.id === node.id } })));
    searchInputRef.current?.focus();
  }, []);

  const downloadImage = useCallback(async () => {
    try {
      await rfInstanceRef.current?.fitView({ padding: 0.2 });
      await new Promise((r) => setTimeout(r, 120));
      const el = flowWrapperRef.current?.querySelector('.react-flow');
      if (!el) return;
      const bg = theme === 'dark' ? '#0b1020' : '#f8fafc';
      const png = await toPng(el, { pixelRatio: 2, backgroundColor: bg });
      const a = document.createElement('a');
      a.download = 'jason-tree.png';
      a.href = png;
      a.click();
      showToast('Downloaded PNG');
    } catch (e) {
      console.error(e);
      showToast('Failed to export image');
    }
  }, [theme]);

  // Zoom helpers exposed to parent (App) via ref
  const zoomIn = () => rfInstanceRef.current?.zoomIn?.();
  const zoomOut = () => rfInstanceRef.current?.zoomOut?.();
  const fitView = () => rfInstanceRef.current?.fitView?.({ padding: 0.2 });

  useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    fitView,
    collapseAll,
    expandAll
  }));

  return (
    <div className="grid h-full min-h-0 md:grid-cols-[360px_1fr]">
      <aside className="min-h-0 overflow-auto border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">JSON Input</label>
          <textarea
            className="min-h-[220px] max-h-[380px] w-full resize-y rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="{ ... paste JSON here ... }"
          />
          {error && (
            <div className="mt-2 rounded-lg border border-rose-300 bg-rose-100 px-3 py-2 text-sm text-rose-900 dark:border-rose-700 dark:bg-rose-900/60 dark:text-rose-100">
              {error}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={visualize}
            >
              Visualize
            </button>
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={() => setInput(SAMPLE_JSON)}
            >
              Load Sample
            </button>
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={clearAll}
            >
              Clear
            </button>
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={downloadImage}
            >
              Download PNG
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Search (JSONPath)</label>
          <input
            ref={searchInputRef}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onKeyDownSearch}
            placeholder="e.g., $.user.address.city or items[0].name"
          />
          {searchMsg && (
            <div
              className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
                searchMsg.includes('No') || searchMsg.includes('Invalid')
                  ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-100'
                  : 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-100'
              }`}
            >
              {searchMsg}
            </div>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <p className="mb-1 text-sm font-medium">Tips:</p>
          <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
            <li>Click a node to copy its JSONPath.</li>
            <li>Leading $ is optional.</li>
            <li>Dot notation: user.address.city</li>
            <li>Arrays: items[0].name</li>
            <li>Weird keys: $['a.b'][1]["sp ace"]</li>
          </ul>
        </div>
      </aside>

      <main
        className="relative h-full min-h-0 overflow-hidden bg-[radial-gradient(1000px_600px_at_40%_30%,#f1f5f9,#f8fafc)] dark:bg-[radial-gradient(1000px_600px_at_40%_30%,#0f172a,#0b1020)]"
        ref={flowWrapperRef}
      >
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{ animated: false }}
          onNodeClick={onNodeClick}
          onInit={(instance) => { rfInstanceRef.current = instance; }}
        >
          <Background gap={16} color={theme === 'dark' ? '#e9e9ee' : '#cbd5e1'} />
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n?.data?.kind === 'object') return '#7c3aed';
              if (n?.data?.kind === 'array') return '#10b981';
              return '#f59e0b';
            }}
            nodeColor={(n) => {
              if (n?.data?.kind === 'object') return '#ede9fe';
              if (n?.data?.kind === 'array') return '#ecfdf5';
              return '#fff7ed';
            }}
          />
          <Controls />
        </ReactFlow>

        {toast && (
          <div className="fixed bottom-4 right-4 z-[1000] rounded-xl border border-slate-600 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-lg dark:border-slate-300 dark:bg-white dark:text-slate-900">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
});

export default JasonTreeVisualizer;