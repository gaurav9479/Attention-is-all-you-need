export default function InsightPanel({ analysis, isLoading, selectedFile }) {
  if (!selectedFile) {
    return (
      <aside className="w-[320px] h-full border-l border-slate-800 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center p-8 text-center text-slate-500 text-xs italic shrink-0">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center shadow-inner">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          Click a node to generate AI insights.
        </div>
      </aside>
    );
  }

  const riskColor = (score) => {
    if (score > 70) return "bg-red-500";
    if (score > 30) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const riskText = (score) => {
    if (score > 70) return "text-red-400";
    if (score > 30) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <aside className="w-[320px] h-full border-l border-slate-800 bg-slate-900/30 flex flex-col shrink-0 overflow-hidden font-sans">
      <header className="p-5 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-600 mb-1 leading-none">Inspecting</h2>
        <div className="text-[13px] font-bold text-slate-100 truncate flex items-center gap-2" title={selectedFile.name}>
          <div className="w-2 h-2 bg-blue-500/50 rounded-sm"></div>
          {selectedFile.name}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-10 scrollbar-thin scrollbar-thumb-slate-800 custom-scrollbar pb-10">
        {isLoading ? (
          <div className="space-y-8 animate-pulse pt-2">
            <div className="space-y-3">
              <div className="h-2 bg-slate-800 rounded w-1/4"></div>
              <div className="h-20 bg-slate-800 rounded w-full border border-slate-800/50"></div>
            </div>
            <div className="space-y-3">
              <div className="h-2 bg-slate-800 rounded w-1/3"></div>
              <div className="h-8 bg-slate-800 rounded w-full border border-slate-800/50"></div>
            </div>
          </div>
        ) : analysis ? (
          <>
            {/* PURPOSE */}
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400/80 flex items-center gap-2">
                Purpose
              </h3>
              <div className="p-4 bg-slate-950 border border-slate-800 text-[13px] text-slate-300 leading-relaxed font-medium rounded-xl shadow-inner-dark italic border-l-2 border-l-blue-500/50">
                "{analysis.purpose}"
              </div>
            </section>

            {/* RISK SCORE */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400/80">Security Audit</h3>
                <span className={`text-[13px] font-black font-mono ${riskText(analysis.risk_score)}`}>{analysis.risk_score}%</span>
              </div>
              <div className="h-[6px] bg-slate-950 rounded-full border border-slate-800/50 overflow-hidden relative">
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-full ${riskColor(analysis.risk_score)} shadow-[0_0_12px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-out`} 
                    style={{ width: `${analysis.risk_score}%` }}
                  ></div>
              </div>
            </section>

            {/* WARNINGS */}
            <section className="space-y-4">
              <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400/80">Vulnerability flags</h3>
              <div className="space-y-2">
                 {analysis.warnings?.length > 0 ? analysis.warnings.map((w, i) => (
                   <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg group hover:bg-red-500/10 transition-colors">
                     <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 group-hover:scale-125 transition-transform"></div>
                     <span className="text-[11px] text-red-400/90 font-bold leading-tight uppercase tracking-wide">{w}</span>
                   </div>
                 )) : (
                   <span className="text-slate-600 text-[11px] italic font-medium uppercase tracking-widest pl-2">No critical warnings found.</span>
                 )}
              </div>
            </section>

            {/* STRUCTURES */}
            <section className="space-y-6 pt-4 border-t border-slate-800/50">
               <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400/80">Structural anatomy</h3>
              <div className="space-y-5">
                {analysis.functions?.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-[9px] uppercase font-bold text-slate-600 tracking-widest pl-1">Identified Functions</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.functions.map((f, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-950 border border-slate-800 text-slate-400 text-[11px] font-mono rounded-lg hover:border-blue-500/30 hover:text-slate-200 transition-all cursor-default">
                          {f}()
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.classes?.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-[9px] uppercase font-bold text-slate-600 tracking-widest pl-1">Object Classes</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.classes.map((c, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-950 border border-slate-800 text-amber-400/70 text-[11px] font-mono rounded-lg font-bold shadow-sm hover:scale-105 transition-all">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-600 text-[11px] uppercase tracking-widest leading-loose mt-20 opacity-50">
            Awaiting module analysis...
          </div>
        )}
      </div>
    </aside>
  );
}
