export default function InsightPanel({
  analysis,
  impactAnalysis,
  impactType = "modify",
  impactLoading = false,
  onRunImpactSimulation,
  isLoading,
  selectedFile,
}) {
  if (!selectedFile) {
    return (
      <aside className="w-[380px] h-full border-l border-slate-800 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center p-8 text-center text-slate-500 text-xs italic shrink-0">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center shadow-inner">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          Select a node or prompt the MCP Command Bar for architectural insights.
        </div>
      </aside>
    );
  }

  const getRiskColor = (score) => {
    if (score >= 70) return "bg-red-500";
    if (score >= 35) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getRiskText = (score) => {
    if (score >= 70) return "text-red-400";
    if (score >= 35) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <aside className="w-[380px] h-full border-l border-slate-800 bg-slate-900/30 flex flex-col shrink-0 overflow-hidden font-sans">
      <header className="p-5 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-600 mb-1 leading-none">MCP Reasoner Output</h2>
        <div className="text-[13px] font-bold text-slate-100 truncate flex items-center gap-2" title={selectedFile?.name}>
          <div className="w-2 h-2 bg-purple-500/50 rounded-sm"></div>
          {analysis?.focus_node ? `${analysis.focus_node.type}: ${analysis.focus_node.label}` : selectedFile?.name}
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
            {/* SUMMARY */}
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-purple-400/80 flex items-center gap-2">
                Context Summary
              </h3>
              <div className="p-4 bg-slate-950 border border-slate-800 text-[13px] text-slate-300 leading-relaxed font-medium rounded-xl shadow-inner-dark italic border-l-2 border-l-purple-500/50">
                "{analysis.purpose || analysis.summary}"
              </div>
            </section>

            {analysis.inputs_outputs && analysis.inputs_outputs !== "N/A" && (
              <section className="space-y-3 pt-4 border-t border-slate-800/50">
                <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400/80">
                  I/O Signature
                </h3>
                <div className="p-3 bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 rounded-lg">
                  {analysis.inputs_outputs}
                </div>
              </section>
            )}

            {analysis.complexity && analysis.complexity !== "N/A" && (
              <section className="space-y-3 pt-4 border-t border-slate-800/50">
                <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-400/80">
                  Complexity & Logic Density
                </h3>
                <div className="p-3 bg-slate-950/80 border border-slate-800 text-[12px] text-slate-300 rounded-lg">
                  {analysis.complexity}
                </div>
              </section>
            )}

            {analysis.side_effects && analysis.side_effects.length > 0 && (
              <section className="space-y-3 pt-4 border-t border-slate-800/50">
                <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-amber-400/80">
                  Identified Side Effects
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-[12px] text-slate-400">
                  {analysis.side_effects.map((se, i) => (
                    <li key={i}>{se}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* DUAL RISK SCORING */}
            {analysis.risk && (
              <section className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-purple-400/80">Local Security Risk</h3>
                    <span className={`text-[12px] font-black font-mono ${getRiskText(analysis.risk.local_score)}`}>{analysis.risk.local_score}% ({analysis.risk.local_level})</span>
                  </div>
                  <div className="h-[4px] bg-slate-950 rounded-full border border-slate-800/50 overflow-hidden relative">
                      <div className={`absolute top-0 left-0 h-full rounded-full ${getRiskColor(analysis.risk.local_score)} transition-all duration-1000 ease-out`} style={{ width: `${analysis.risk.local_score}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-purple-400/80">Propagated Architecture Risk</h3>
                    <span className={`text-[12px] font-black font-mono ${getRiskText(analysis.risk.propagated_score)}`}>{analysis.risk.propagated_score}% ({analysis.risk.propagated_level})</span>
                  </div>
                  <div className="h-[4px] bg-slate-950 rounded-full border border-slate-800/50 overflow-hidden relative">
                      <div className={`absolute top-0 left-0 h-full rounded-full ${getRiskColor(analysis.risk.propagated_score)} shadow-[0_0_10px_rgba(255,0,0,0.5)] transition-all duration-1000 ease-out`} style={{ width: `${analysis.risk.propagated_score}%` }}></div>
                  </div>
                  <p className="text-[9px] text-slate-600 mt-2 italic leading-tight">{analysis.risk.propagation_note}</p>
                </div>
              </section>
            )}

            {/* DEPENDENCIES */}
            {analysis.dependencies && (
              <section className="space-y-6 pt-4 border-t border-slate-800/50">
                 <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400/80">Dependency Tree</h3>
                 
                 {analysis.dependencies.direct_callers?.length > 0 && (
                   <div className="space-y-2.5">
                     <h4 className="text-[9px] uppercase font-bold text-slate-500 tracking-widest pl-1">Directly Called By</h4>
                     <div className="flex flex-col gap-1">
                       {analysis.dependencies.direct_callers.slice(0, 5).map((d, i) => (
                         <div key={i} className="px-3 py-2 bg-slate-950/80 border border-slate-800 text-slate-400 text-[11px] font-mono rounded-lg flex justify-between items-center truncate">
                           <span className="truncate">{d.node_id.split('/').pop()}</span>
                           <span className="text-[9px] text-blue-500/50">{d.relation}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {analysis.dependencies.direct_callees?.length > 0 && (
                   <div className="space-y-2.5">
                     <h4 className="text-[9px] uppercase font-bold text-slate-500 tracking-widest pl-1">Downstream Calls</h4>
                     <div className="flex flex-col gap-1">
                       {analysis.dependencies.direct_callees.slice(0, 5).map((d, i) => (
                         <div key={i} className="px-3 py-2 bg-slate-950/80 border border-slate-800 text-slate-400 text-[11px] font-mono rounded-lg flex justify-between items-center truncate">
                           <span className="truncate">{d.node_id.split('/').pop()}</span>
                           <span className="text-[9px] text-emerald-500/50">{d.relation}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
              </section>
            )}

            {/* SYSTEM INSIGHTS */}
            {analysis.insights && analysis.insights.critical_modules && (
               <section className="space-y-6 pt-4 border-t border-slate-800/50">
                 <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-red-400/80">Global System Bottlenecks</h3>
                 <p className="text-[9px] text-slate-500 italic mt-0.5 leading-tight">These are the most highly-coupled modules in your entire repository.</p>
                 <div className="flex flex-col gap-2 mt-3">
                   {analysis.insights.bottlenecks?.map((b, i) => (
                     <div key={i} className="px-3 py-2 bg-slate-950 border border-red-900/30 text-amber-200/80 text-[10px] font-mono rounded-lg shadow-inner">
                       <span className="block truncate text-amber-500 font-bold mb-1">{b.node_id}</span>
                       Fan-In: {b.fan_in} | Fan-Out: {b.fan_out}
                     </div>
                   ))}
                 </div>
               </section>
            )}

            {/* SIMILAR/MATCHES */}
            {(analysis.matches?.length > 0) && (
              <section className="space-y-3 pt-4 border-t border-slate-800/50">
                <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-fuchsia-400/80 flex items-center gap-2">
                  Semantic Matches / Similarity
                </h3>
                 <div className="flex flex-wrap gap-2">
                   {analysis.matches.map((m, i) => (
                     <span key={i} className="px-2 py-1 bg-fuchsia-950/30 border border-fuchsia-900/50 text-fuchsia-300/80 text-[10px] font-mono rounded-lg flex gap-2">
                       {m.label} <span className="opacity-50">{m.score}%</span>
                     </span>
                   ))}
                 </div>
              </section>
            )}

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

            {/* IMPACT SIMULATOR (PHASE 1) */}
            {impactAnalysis && (
              <section className="space-y-4 pt-4 border-t border-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-amber-400/90">Impact Simulator</h3>
                  <span className="text-[12px] font-black font-mono text-amber-300">{impactAnalysis?.impact?.score || 0}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={impactType}
                    onChange={(e) => onRunImpactSimulation?.(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-slate-300 outline-none focus:border-amber-500/60"
                  >
                    <option value="modify">Modify Node</option>
                    <option value="delete">Delete Node</option>
                    <option value="create">Create Node</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onRunImpactSimulation?.(impactType)}
                    disabled={impactLoading}
                    className="px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-amber-500/20 border border-amber-500/40 text-amber-300 disabled:opacity-50"
                  >
                    {impactLoading ? "Simulating..." : "Simulate"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                    <div className="text-slate-500 uppercase tracking-wider">Blast Radius</div>
                    <div className="text-slate-200 font-bold text-[12px] mt-1">{impactAnalysis?.blast_radius?.total_impacted_nodes || 0} nodes</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                    <div className="text-slate-500 uppercase tracking-wider">Impact Level</div>
                    <div className="text-amber-300 font-bold text-[12px] mt-1">{impactAnalysis?.impact?.level || "LOW"}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-[9px] uppercase font-bold text-slate-600 tracking-widest">Top Affected Nodes</h4>
                  {impactAnalysis?.top_impacted_nodes?.length > 0 ? (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {impactAnalysis.top_impacted_nodes.slice(0, 8).map((item) => (
                        <div key={item.node_id} className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/70">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-200 font-semibold truncate" title={item.label}>{item.label}</span>
                            <span className="text-[10px] font-mono text-amber-300">{item.impact_score}%</span>
                          </div>
                          <div className="text-[9px] text-slate-500 mt-1 truncate" title={item.path}>{item.path}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">No impacted nodes detected.</div>
                  )}
                </div>
              </section>
            )}
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
