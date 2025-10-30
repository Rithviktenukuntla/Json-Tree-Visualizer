import React from 'react';
import { Handle, Position } from 'reactflow';

export default function JasonNode({ data }) {
  const { kind, label, valuePreview, pathDisplay, isMatch } = data;

  const kindClasses =
    kind === 'object'
      ? 'bg-violet-50 border-violet-600'
      : kind === 'array'
      ? 'bg-emerald-50 border-emerald-600'
      : 'bg-amber-50 border-amber-500';

  const matchClasses = isMatch ? 'ring-4 ring-red-400 ring-offset-2 ring-offset-white/50' : '';

  return (
    <div
      className={`group relative min-w-[110px] max-w-[260px] rounded-xl border-l-4 px-3 py-2 shadow ${kindClasses} ${matchClasses}`}
      title="Click to copy path"
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div>
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <span className="text-xs">{kind === 'object' ? '🟪' : kind === 'array' ? '🟩' : '🟧'}</span>
          <span className="truncate">{label}</span>
        </div>
        {kind === 'primitive' && (
          <div className="mt-1 font-mono text-slate-900">{valuePreview}</div>
        )}
        <div className="pointer-events-none absolute left-0 -top-2 -translate-y-full opacity-0 transition group-hover:opacity-100">
          <div className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-xl dark:border-slate-300 dark:bg-white dark:text-slate-900">
            <div><strong>Path:</strong> {pathDisplay}</div>
            {kind === 'primitive' && <div><strong>Value:</strong> {valuePreview}</div>}
            <div><strong>Type:</strong> {kind}</div>
            <div className="mt-1 opacity-80">Click node to copy path</div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}
