import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cloneRepo } from "../services/api";

export default function Home() {
  // 0: Mode Selection, 1: Repo Input, 2: Loading State
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState(null); // 'normal' | 'deep'
  
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    setStep(1); // Advance to input
  };

  const startAnalysis = async (url) => {
    if (!url) return;
    setRepoUrl(url);
    setStep(2); // Advance to loading
    setError(null);
    
    try {
      await cloneRepo(url);
      
      // Cinematic pause before transition for immersion
      setTimeout(() => {
        navigate("/analyze", { state: { uiMode: selectedMode, repoUrl: url } });
      }, 1500);

    } catch (err) {
      console.error(err);
      setError("Failed to clone repository. Please check the URL.");
      setStep(1); // Drop back to input
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    startAnalysis(repoUrl);
  };

  return (
    <div className={`flex h-screen w-full items-center justify-center font-sans overflow-hidden transition-colors duration-1000 ${selectedMode === 'deep' ? 'bg-[#050505]' : 'bg-[#0d0d0f]'}`}>
      
      {/* STEP 0: MODE SELECTION */}
      {step === 0 && (
        <div className="flex flex-col items-center w-full max-w-5xl px-8 animate-fade-in-up">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500 mb-4 tracking-tight">
            How do you want to see your code?
          </h1>
          <p className="text-slate-500 mb-12">Select your visualization lens before initializing the matrix.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* NORMAL MODE CARD */}
            <div 
              onClick={() => handleModeSelect('normal')}
              className="group relative h-96 bg-slate-900/50 rounded-3xl border border-slate-800 p-8 cursor-pointer hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_0_50px_rgba(245,158,11,0.15)] hover:border-amber-500/50 flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-700 bg-[linear-gradient(rgba(245,158,11,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(1000px)_rotateX(60deg)_translateZ(-200px)_translateY(-100px)] group-hover:[transform:perspective(1000px)_rotateX(60deg)_translateZ(0px)_translateY(0px)]" />
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-amber-500 mb-2">Architectural X-Ray</h2>
                <p className="text-slate-400 leading-relaxed max-w-sm">Examine the rigid structural hierarchy, dependencies, and execution flow. Perfect for debugging and architecture review.</p>
              </div>
              <div className="relative z-10 self-end text-amber-500/50 group-hover:text-amber-400 group-hover:translate-x-2 transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>

            {/* DEEP MODE CARD */}
            <div 
              onClick={() => handleModeSelect('deep')}
              className="group relative h-96 bg-slate-900/50 rounded-3xl border border-slate-800 p-8 cursor-pointer hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_0_50px_rgba(168,85,247,0.15)] hover:border-purple-500/50 flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                 <div className="w-64 h-64 border border-purple-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                 <div className="absolute w-48 h-48 border border-purple-500/30 rounded-full animate-[spin_7s_linear_infinite_reverse]" />
                 <div className="absolute w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_20px_#a855f7] animate-pulse" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-purple-400 mb-2">Cosmic Matrix</h2>
                <p className="text-slate-400 leading-relaxed max-w-sm">Dive into the deep void. Discover emergent organic patterns and massive interconnected clusters in sprawling repositories.</p>
              </div>
              <div className="relative z-10 self-end text-purple-500/50 group-hover:text-purple-400 group-hover:translate-x-2 transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: REPOSITORY INPUT */}
      {step === 1 && (
        <div className="flex flex-col items-center w-full max-w-2xl px-8 animate-zoom-in">
          <button onClick={() => setStep(0)} className="absolute top-8 left-8 text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Change Mode
          </button>

          <h2 className={`text-2xl font-black mb-8 uppercase tracking-widest ${selectedMode === 'normal' ? 'text-amber-500' : 'text-purple-400'}`}>
            {selectedMode === 'normal' ? "Target Architecture Protocol" : "Input Cosmic Coordinates"}
          </h2>

          <form onSubmit={handleManualSubmit} className="w-full relative group">
            <div className={`absolute -inset-1 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 ${selectedMode === 'normal' ? 'bg-amber-500' : 'bg-purple-500'}`}></div>
            <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2 w-full">
              <input
                type="url"
                placeholder="https://github.com/user/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
                autoFocus
                className="w-full bg-transparent border-none outline-none text-lg text-slate-200 placeholder:text-slate-600 px-6 py-4"
              />
              <button
                type="submit"
                className={`flex-shrink-0 px-8 py-4 rounded-xl text-white font-black tracking-widest uppercase text-sm transition-all shadow-xl hover:scale-105 ${selectedMode === 'normal' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/50' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/50'}`}
              >
                {selectedMode === 'normal' ? 'Map Codebase' : 'Ignite Universe'}
              </button>
            </div>
          </form>

          {error && <p className="text-red-500 mt-6 font-semibold animate-pulse">{error}</p>}

          <div className="mt-12 flex flex-col items-center">
            <p className="text-slate-600 uppercase tracking-widest text-[10px] font-bold mb-4">Or bypass manual entry</p>
            <div className="flex gap-4">
               <button onClick={() => startAnalysis('https://github.com/facebook/react')} className="px-4 py-2 rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-600 text-xs font-bold transition-all transform hover:-translate-y-1">
                 Demo: React.js
               </button>
               <button onClick={() => startAnalysis('https://github.com/expressjs/express')} className="px-4 py-2 rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-600 text-xs font-bold transition-all transform hover:-translate-y-1">
                 Demo: Express.js
               </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: LOADING EXPERIENCE */}
      {step === 2 && (
        <div className="flex flex-col items-center justify-center w-full max-w-2xl px-8 animate-fade-in pointer-events-none">
          {selectedMode === 'normal' ? (
            // BLUEPRINT GRID LOADING
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 border border-amber-500/20 bg-[linear-gradient(rgba(245,158,11,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.2)_1px,transparent_1px)] bg-[size:10px_10px] animate-pulse rounded-xl [transform:perspective(500px)_rotateX(60deg)] drop-shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-12 shadow-inner" />
              <div className="h-1 w-64 bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-amber-500 w-1/2 animate-[progress_1.5s_ease-in-out_infinite]" />
              </div>
              <h2 className="mt-6 text-amber-500 font-bold tracking-widest uppercase text-sm animate-pulse">Constructing Schematics...</h2>
            </div>
          ) : (
            // GALAXY COLLAPSE LOADING
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
                <div className="absolute w-full h-full border-t-2 border-l-2 border-purple-500 rounded-full animate-[spin_1s_linear_infinite]" />
                <div className="absolute w-3/4 h-3/4 border-b-2 border-r-2 border-fuchsia-500 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
                <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_50px_20px_#a855f7] animate-pulse" />
              </div>
              <h2 className="mt-2 text-purple-400 font-bold tracking-widest uppercase text-sm animate-pulse">Igniting Core Galaxies...</h2>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
