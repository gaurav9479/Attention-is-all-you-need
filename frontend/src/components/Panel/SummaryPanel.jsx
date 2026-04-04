const getRiskColor = (risk) => {
  const r = String(risk).toLowerCase();
  if (r === "high") return "text-red-400 bg-red-400/10 border-red-500/30";
  if (r === "medium") return "text-amber-400 bg-amber-400/10 border-amber-500/30";
  if (r === "low") return "text-emerald-400 bg-emerald-400/10 border-emerald-500/30";
  return "text-slate-400 bg-slate-800 border-slate-700";
};

export default function SummaryPanel({ summary, loading }) {
  return (
    <section className="flex flex-col">
      <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-3 flex items-center gap-2 mt-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
        AI Insight
      </h3>

      {loading ? (
        <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl animate-pulse space-y-4">
            <div className="h-4 bg-slate-800 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-800 rounded w-full"></div>
              <div className="h-3 bg-slate-800 rounded w-5/6"></div>
              <div className="h-3 bg-slate-800 rounded w-4/6"></div>
            </div>
        </div>
      ) : summary ? (
        <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl space-y-5">
          
          <div>
            <h4 className="text-xs uppercase font-semibold text-slate-500 mb-1">Purpose</h4>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
              {summary.purpose || "Unknown"}
            </p>
          </div>

          <div className="flex gap-4">
              <div className="flex-1">
                <h4 className="text-xs uppercase font-semibold text-slate-500 mb-1">Inputs</h4>
                <div className="text-sm text-slate-300 font-mono bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/50 truncate">
                  {summary.inputs || "Unknown"}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-xs uppercase font-semibold text-slate-500 mb-1">Output</h4>
                <div className="text-sm text-slate-300 font-mono bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/50 truncate">
                  {summary.output || "Unknown"}
                </div>
              </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-2">
              <h4 className="text-xs uppercase font-semibold text-slate-500 leading-none">Risk Profile</h4>
              <span className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-md border tracking-wider ${getRiskColor(summary.risk)}`}>
                {summary.risk || "Unknown"}
              </span>
          </div>

        </div>
      ) : (
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 text-slate-500 text-sm">
          No summary generated.
        </div>
      )}
    </section>
  );
}
