import { useState, useRef, useEffect } from "react";
import { fetchChat, fetchFileContent } from "../../services/api";

const SUGGESTIONS = [
  "Which files are the riskiest?",
  "What are the critical hotspots?",
  "Show me the highest-coupled modules.",
  "What would break if I changed this file?",
  "Refactoring suggestions for this codebase.",
  "Which functions have the highest blast radius?",
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  
  // Render user text normally
  if (isUser || typeof msg.content === 'string') {
    return (
      <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div
          className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${
            isUser ? "bg-blue-600 text-white" : "bg-purple-900 text-purple-300"
          }`}
        >
          {isUser ? "U" : "⚡"}
        </div>
        <div
          className={`max-w-[88%] rounded-xl px-3 py-2.5 text-[12px] leading-relaxed ${
            isUser
              ? "bg-blue-900/30 border border-blue-800/40 text-blue-100 rounded-tr-none"
              : "bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap"
          }`}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  // Render structured JSON for Assistant
  const { purpose, inputs_outputs, side_effects, complexity, risk } = msg.content;
  const riskColor = risk === "HIGH" ? "text-red-400 bg-red-950/50 border-red-900" 
                  : risk === "MED" ? "text-amber-400 bg-amber-950/50 border-amber-900" 
                  : "text-emerald-400 bg-emerald-950/50 border-emerald-900";

  return (
    <div className="flex gap-2 flex-row">
       <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black bg-purple-900 text-purple-300">
         ⚡
       </div>
       <div className="max-w-[88%] rounded-xl px-3 py-2.5 text-[11px] leading-relaxed bg-slate-900/80 border border-slate-800 text-slate-200 flex flex-col gap-3 rounded-tl-none">
          {/* Risk Badge */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
             <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Code Intelligence</span>
             <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider border ${riskColor}`}>
               RISK: {risk}
             </span>
          </div>
          
          <div>
            <div className="text-purple-400 font-bold mb-0.5 text-[10px] uppercase">Purpose</div>
            <div className="text-slate-300">{purpose}</div>
          </div>

          {(inputs_outputs && inputs_outputs.toLowerCase() !== "n/a") && (
            <div>
              <div className="text-blue-400 font-bold mb-0.5 text-[10px] uppercase">I/O Signature</div>
              <div className="text-slate-300 bg-slate-950/50 p-1.5 rounded border border-slate-800/50 font-mono text-[10px]">{inputs_outputs}</div>
            </div>
          )}

          <div>
            <div className="text-emerald-400 font-bold mb-0.5 text-[10px] uppercase">Complexity</div>
            <div className="text-slate-300">{complexity}</div>
          </div>

          {(side_effects && side_effects.length > 0) && (
            <div>
              <div className="text-amber-400 font-bold mb-0.5 text-[10px] uppercase">Side Effects</div>
              <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
                {side_effects.map((se, i) => (
                  <li key={i}>{se}</li>
                ))}
              </ul>
            </div>
          )}
       </div>
    </div>
  );
}

export default function ChatBot({ repoName, selectedNode, mode = "normal" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `CodeMap AI ready. ${repoName ? `Analyzing: ${repoName}.` : "Analyze a repository to begin."} Ask me anything about the codebase structure, risks, or architecture.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-greet when a new node is selected
  useEffect(() => {
    if (selectedNode && open) {
      const name = selectedNode.name || selectedNode.label || "this node";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `You've focused on "${name}". I can analyze its risk, dependencies, or blast radius. What would you like to know?`,
        },
      ]);
    }
  }, [selectedNode, open]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q || !repoName) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const contextPrefix = selectedNode
        ? `The user is currently focusing on a node named "${selectedNode.name || selectedNode.label}" (Path: ${selectedNode.path || "root"}). Assume the question is about this file or its dependencies.`
        : `The user has the repository "${repoName}" analyzed with CodeMap. They are looking at the overall architecture.`;
        
      // Fetch the node's code if one is selected, to feed local context.
      let code = "";
      let filename = "";
      if (selectedNode && selectedNode.path) {
          try {
              const codeResp = await fetchFileContent(selectedNode.path, repoName);
              code = codeResp?.content || "";
              filename = selectedNode.path;
          } catch (err) {
              console.error("Could not fetch file context:", err);
          }
      }

      const payload = await fetchChat(q, contextPrefix, code, filename, "conversational", repoName);

      setMessages((prev) => [...prev, { role: "assistant", content: payload.reply || "No response generated." }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠ Chat query failed. Ensure the AI service is running." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[200] w-12 h-12 rounded-full bg-purple-700 hover:bg-purple-600 text-white font-black text-lg shadow-2xl shadow-purple-900/60 border border-purple-500/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
        title="Toggle AI Chatbot"
      >
        {open ? "×" : "⚡"}
      </button>

      <div
        className={`fixed bottom-[76px] right-6 z-[199] w-[340px] rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl flex flex-col transition-all duration-300 ease-out ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ maxHeight: "520px" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-purple-950/60 to-slate-950 rounded-t-2xl shrink-0">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">CodeMap AI</h3>
          <span className="ml-auto text-[9px] text-slate-600 font-mono uppercase">{mode} mode</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
          {messages.map((m, i) => (
            <Message key={i} msg={m} />
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-900 text-purple-300 flex items-center justify-center text-[10px] font-black shrink-0">⚡</div>
              <div className="flex items-center gap-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl rounded-tl-none">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 2 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[9px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:border-purple-600/50 hover:text-purple-300 transition-colors truncate max-w-full"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2 px-3 py-3 border-t border-slate-800 shrink-0"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={repoName ? "Ask about this codebase..." : "Analyze a repo first..."}
            disabled={!repoName || loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-200 outline-none focus:border-purple-600/60 placeholder:text-slate-600 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || !repoName || loading}
            className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-bold disabled:opacity-30 transition-colors"
          >
            →
          </button>
        </form>
      </div>
    </>
  );
}
