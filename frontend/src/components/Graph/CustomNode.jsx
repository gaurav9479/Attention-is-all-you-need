import { memo } from 'react'
import { Handle, Position } from 'reactflow'

const TYPE_STYLES = {
  root: {
    colorClass: 'glow-indigo',
    icon: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    label: 'text-indigo-100'
  },
  file: {
    colorClass: 'glow-blue',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    ),
    label: 'text-slate-100'
  },
  function: {
    colorClass: 'glow-emerald',
    icon: (
      <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
        <div className="text-[8px] font-black text-emerald-500 font-mono tracking-tighter">FN</div>
      </div>
    ),
    label: 'text-slate-200'
  },
  class: {
    colorClass: 'glow-rose',
    icon: (
      <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
        <div className="text-[8px] font-black text-rose-400 font-mono tracking-tighter uppercase">CL</div>
      </div>
    ),
    label: 'text-slate-100'
  },
  folder: {
    colorClass: 'glow-amber',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
    ),
    label: 'text-amber-100 uppercase tracking-wider text-[12px]'
  }
}

function CustomNode({ data, selected, id }) {
  const isGateway = data.layer === 0;
  const isAtomic = data.layer === 2;
  const isFolder = data.type === 'folder';
  const style = TYPE_STYLES[data.type] || TYPE_STYLES.file;

  const animationDelay = (id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5).toFixed(1);

  return (
    <div 
      style={{ '--delay': `${animationDelay}s` }}
      className={`
        relative group p-3 px-4 rounded-lg border transition-all duration-400 w-[220px] h-[80px]
        bg-glass bg-glass-hover flex items-center gap-4 animate-zoom-in
        ${selected 
          ? 'border-indigo-400 ring-2 ring-indigo-400/20' 
          : 'border-white/10'}
      `}
    >
       {/* Focus Glow */}
       <div className={`node-glow ${style.colorClass} ${selected ? 'opacity-100' : 'opacity-10'}`} />

       {/* Blueprint Corner Accents */}
       <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
       <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/40" />
       <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/40" />
       <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />

       <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-1 !h-1 !border-none" />
       
       <div className="shrink-0">
          {isGateway ? (
            <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          ) : style.icon}
       </div>
       
       <div className="flex flex-col min-w-0">
           <span className={`
             text-[12px] font-bold truncate leading-tight tracking-tight
             ${isGateway ? 'text-amber-400' : style.label}
           `}>
             {data.label || 'Unknown'}
           </span>
           
           {isFolder ? (
              <span className="text-[7px] mt-0.5 px-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black uppercase font-mono">
                 DIR-LAYER
              </span>
           ) : (
              <div className="flex items-center gap-1.5 mt-0.5 opacity-40">
                  <span className="text-[7px] text-indigo-400 font-mono font-bold uppercase">ARC-ID</span>
                  <span className="text-[8px] text-slate-400 truncate max-w-[80px] font-mono">
                      {data.path?.split('/').pop()}
                  </span>
              </div>
           )}
       </div>

       <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-1 !h-1 !border-none" />
    </div>
  )
}

export default memo(CustomNode)
