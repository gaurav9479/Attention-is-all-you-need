import { useState } from "react";

export default function Navbar({ onAnalyze, isLoading }) {
  const [url, setUrl] = useState("");
  const [depth, setDepth] = useState("all");

  return (
    <nav className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center px-6 justify-between shrink-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20 group-hover:scale-105 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4a1 1 0 01-.8 1.6H6a1 1 0 01-1-1V7a1 1 0 00-1-1zM6 5a1 1 0 00-1 1v5h10.38l-1.875-2.5a1 1 0 010-1.2L15.38 5H6z" clipRule="evenodd" />
             </svg>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">CodeMap</span>
        </div>

        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-full pl-4 pr-1 py-1 w-[450px] focus-within:border-blue-500/50 transition-colors">
          <input 
            type="text" 
            placeholder="https://github.com/user/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-600 w-full"
          />
          <button 
            onClick={() => onAnalyze(url, depth)}
            disabled={isLoading || !url}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold px-5 py-2 rounded-full transition-all flex items-center gap-2"
          >
            {isLoading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
           <button 
             onClick={() => setDepth("all")}
             className={`px-3 py-1.5 text-[11px] font-bold rounded-md uppercase tracking-wider transition-all ${depth === "all" ? "bg-slate-800 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
           >
             Full Depth
           </button>
           <button 
             onClick={() => setDepth("files")}
             className={`px-3 py-1.5 text-[11px] font-bold rounded-md uppercase tracking-wider transition-all ${depth === "files" ? "bg-slate-800 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
           >
             Files Only
           </button>
        </div>
      </div>
    </nav>
  );
}
