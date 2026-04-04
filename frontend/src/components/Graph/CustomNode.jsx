import { memo } from 'react'
import { Handle, Position } from 'reactflow'

const TYPE_STYLES = {
  root: {
    bg: 'bg-indigo-600',
    border: 'border-indigo-400',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    label: 'text-white shadow-sm'
  },
  file: {
    bg: 'bg-[#141517]',
    border: 'border-slate-800',
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
    bg: 'bg-[#09090b]',
    border: 'border-slate-800',
    icon: (
      <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
        <div className="text-[8px] font-black text-emerald-500 font-mono tracking-tighter">FN</div>
      </div>
    ),
    label: 'text-slate-400 group-hover:text-slate-200'
  },
  class: {
    bg: 'bg-[#09090b]',
    border: 'border-slate-800',
    icon: (
      <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
        <div className="text-[8px] font-black text-purple-400 font-mono tracking-tighter uppercase">CL</div>
      </div>
    ),
    label: 'text-slate-400'
  }
}

function CustomNode({ data, selected }) {
  const style = TYPE_STYLES[data.type] || TYPE_STYLES.file;

  return (
    <div className={`
      relative group px-4 py-3 rounded-2xl border transition-all duration-300 min-w-[180px]
      ${style.bg} ${style.border}
      ${selected 
        ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.2)] -translate-y-1 scale-105 z-50' 
        : 'hover:border-slate-700 shadow-xl shadow-black/40 hover:-translate-y-0.5'}
    `}>
       <Handle type="target" position={Position.Top} className="!w-0 !h-0 !border-0 !bg-transparent" />
       
       <div className="flex items-center gap-3">
          <div className="shrink-0 transition-transform group-hover:scale-110 duration-300">{style.icon}</div>
          <div className="flex flex-col min-w-0 pr-2">
             <span className={`text-[13px] font-bold truncate tracking-tight transition-colors ${style.label}`}>
               {data.label}
             </span>
             {data.path && (
               <span className="text-[9px] text-slate-500 truncate mt-0.5 font-medium uppercase tracking-[0.05em] font-mono opacity-60">
                 {data.path.split('/').slice(-2).join('/')}
               </span>
             )}
          </div>
       </div>

       <Handle type="source" position={Position.Bottom} className="!w-0 !h-0 !border-0 !bg-transparent" />
       
       {/* Selection Indicator bar */}
       {selected && (
         <div className="absolute -bottom-[2px] left-1/4 right-1/4 h-[3px] bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
       )}
    </div>
  )
}

export default memo(CustomNode)
