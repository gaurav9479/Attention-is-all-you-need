export default function CodePanel({ code, loading }) {
  return (
    <section className="flex flex-col">
      <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Source Code
      </h3>
      
      {loading ? (
        <div className="h-32 bg-slate-950/50 border border-slate-800 rounded-xl flex items-center justify-center animate-pulse">
          <span className="text-slate-500 text-sm">Fetching code...</span>
        </div>
      ) : code ? (
        <div className="relative group">
          <pre className="code-block bg-[#0d1117] text-slate-300 p-4 border border-slate-800 rounded-xl overflow-x-auto shadow-inner max-h-[40vh]">
            <code>{code}</code>
          </pre>
        </div>
      ) : (
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 text-slate-500 text-sm">
          No code available for this node type.
        </div>
      )}
    </section>
  );
}
