import { memo } from 'react'
import { Handle, Position } from 'reactflow'

const TYPE_STYLES = {
  root: {
    bg: 'bg-indigo-900/50',
    border: 'border-indigo-400',
    icon: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    label: 'text-indigo-100 shadow-sm'
  },
  file: {
    bg: 'bg-[#15171a]',
    border: 'border-blue-500/30',
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
    bg: 'bg-[#0c0d10]',
    border: 'border-emerald-500/30',
    icon: (
      <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
        <div className="text-[8px] font-black text-emerald-500 font-mono tracking-tighter">FN</div>
      </div>
    ),
    label: 'text-slate-200'
  },
  class: {
    bg: 'bg-[#0c0d10]',
    border: 'border-purple-500/30',
    icon: (
      <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
        <div className="text-[8px] font-black text-purple-400 font-mono tracking-tighter uppercase">CL</div>
      </div>
    ),
    label: 'text-slate-100'
  }
}

function CustomNode({ data, selected, id }) {
  const isGateway = data.layer === 0;
  const isAtomic = data.layer === 2;
  const style = TYPE_STYLES[data.type] || TYPE_STYLES.file;

  // Use ID to generate a consistent but "random" animation delay
  const animationDelay = (id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5).toFixed(1);

  return (
    <div 
      style={{ '--delay': `${animationDelay}s` }}
      className={`
        relative group px-4 py-3 rounded-2xl border-2 transition-all duration-500 min-w-[200px] min-h-[64px]
        ${style.bg} ${style.border} flex flex-col justify-center
        ${isGateway ? 'border-amber-500/50 bg-[#1a160f] shadow-[0_0_30px_rgba(245,158,11,0.1)]' : ''}
        ${data.isImpact ? 'node-impact shadow-[0_0_50px_rgba(245,158,11,0.4)] scale-110 !border-amber-500 bg-[#1c1a16]' : ''}
        ${selected 
          ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.4)] -translate-y-2 scale-110' 
          : 'border-slate-800/80 shadow-2xl shadow-black/80 hover:border-slate-600 hover:-translate-y-1'}
        ${isGateway ? 'node-api-pulse' : ''}
      `}
    >
       <Handle type="target" position={Position.Top} className="opacity-0 cursor-default pointer-events-none" />
       
       <div className={`flex items-center gap-3 ${isAtomic ? 'opacity-90 scale-95' : ''}`}>
          <div className="shrink-0 transition-transform group-hover:scale-110 duration-500">
            {isGateway ? (
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-inner">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            ) : style.icon}
          </div>
          <div className="flex flex-col min-w-0 pr-2">
             <span className={`
               text-[14px] font-extrabold truncate tracking-tight transition-colors
               ${isGateway ? 'text-amber-500' : style.label}
             `}>
               {data.label || 'Unknown'}
             </span>
             {data.path && (
               <span className="text-[10px] text-slate-500 truncate mt-0.5 font-bold uppercase tracking-[0.05em] font-mono opacity-70">
                 {data.path.split('/').slice(-2).join('/')}
               </span>
             )}
          </div>
       </div>

       <Handle type="source" position={Position.Bottom} className="opacity-0 cursor-default pointer-events-none" />
       
       {/* Selection Indicator bar */}
       {selected && (
         <div className="absolute -bottom-[2px] left-1/4 right-1/4 h-[4px] bg-blue-500 rounded-full shadow-[0_0_20px_#3b82f6]"></div>
       )}

       {/* Gateway Badge */}
       {isGateway && (
         <div className="absolute -top-3 -right-2 px-2 py-0.5 bg-amber-500 text-[9px] font-black text-[#0d0d0f] rounded-lg uppercase tracking-widest shadow-xl border border-amber-400/50">
           Gateway
         </div>
       )}
    </div>
  )
}

export default memo(CustomNode)
