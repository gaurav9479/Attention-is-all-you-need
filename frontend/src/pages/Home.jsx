import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cloneRepo } from "../services/api";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleClone = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setError(null);
    try {
      await cloneRepo(repoUrl);
      navigate("/analyze");
    } catch (err) {
      console.error(err);
      setError("Failed to clone repository. Please check the URL or try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 items-center justify-center font-sans text-slate-200">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Codebase Analyzer</h1>
        <p className="text-sm text-slate-400 mb-6 text-center">
          Enter a GitHub repository URL to analyze its structure, functions, and classes.
        </p>

        <form onSubmit={handleClone} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Repository URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/user/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 focus:ring-4 focus:ring-blue-600/30 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
               <>
                 <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                 Cloning...
               </>
            ) : (
               "Analyze Codebase"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
