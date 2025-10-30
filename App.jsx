import React, { useEffect, useRef, useState } from 'react';
import JasonTreeVisualizer from './components/JasonTreeVisualizer.jsx';
import jasonNode from './components/JasonNode.jsx';

export default function App() {
  const getInitialTheme = () => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const treeRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  const zoomIn = () => treeRef.current?.zoomIn?.();
  const zoomOut = () => treeRef.current?.zoomOut?.();
  const fitView = () => treeRef.current?.fitView?.();
  const collapseAll = () => treeRef.current?.collapseAll?.();
  const expandAll = () => treeRef.current?.expandAll?.();

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-transparent px-5 py-3 dark:border-slate-800 dark:from-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-semibold">Json Tree Visualizer</h1>
            <p className="m-0 text-sm text-slate-600 dark:text-slate-400">
              Paste JSON, visualize the tree, and search via JSONPath.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={zoomIn}>➕ Zoom In</button>
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={zoomOut}>➖ Zoom Out</button>
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={fitView}>🧭 Fit</button>

            <div className="mx-1 h-6 w-px bg-slate-300 dark:bg-slate-700" />

            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={collapseAll}>⤵️ Collapse All</button>
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={expandAll}>⤴️ Expand All</button>

            <div className="mx-1 h-6 w-px bg-slate-300 dark:bg-slate-700" />

            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={toggleTheme}>
              🌓 {theme === 'dark' ? 'Dark' : 'Light'} mode
            </button>
          </div>
        </div>
      </header>

      {/* This box takes all the remaining height below the header */}
      <div className="grow min-h-0">
        <JasonTreeVisualizer ref={treeRef} theme={theme} />
      </div>
    </div>
  );
}