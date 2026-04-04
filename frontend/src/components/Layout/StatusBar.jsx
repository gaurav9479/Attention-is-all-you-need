export default function StatusBar({ stats, status = "Ready" }) {
  return (
    <footer className="h-8 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 justify-between shrink-0 z-50 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 font-sans">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
          <span className="text-emerald-500/80 font-black">{status}</span>
        </div>
        {stats?.repoName && (
          <div className="flex items-center gap-2 border-l border-slate-800/50 pl-8 lowercase font-mono normal-case tracking-normal text-slate-400/60 font-medium">
             current context: <span className="text-slate-300">{stats.repoName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-10">
        <div className="flex items-center gap-3">
           <span className="text-slate-600">File Modules:</span>
           <span className="text-blue-400 font-mono text-[11px] font-black">{stats?.totalFiles || 0}</span>
        </div>
        <div className="flex items-center gap-3 border-l border-slate-800/50 pl-10">
           <span className="text-slate-600">Atomized f(n):</span>
           <span className="text-blue-400 font-mono text-[11px] font-black">{stats?.totalFunctions || 0}</span>
        </div>
      </div>
    </footer>
  );
}
