import { memo } from 'react'
import { Handle, Position } from 'reactflow'

const TYPE_CONFIG = {
  file:     { ring: 'border-blue-500',   badge: 'bg-blue-600',   bg: 'bg-blue-950',   text: 'FILE'  },
  function: { ring: 'border-green-500',  badge: 'bg-green-600',  bg: 'bg-green-950',  text: 'FN'    },
  class:    { ring: 'border-purple-500', badge: 'bg-purple-600', bg: 'bg-purple-950', text: 'CLASS' },
  default:  { ring: 'border-slate-500',  badge: 'bg-slate-600',  bg: 'bg-slate-900',  text: 'NODE'  },
}

function CustomNode({ data, selected }) {
  const cfg = TYPE_CONFIG[data?.type] ?? TYPE_CONFIG.default

  return (
    <div
      className={`
        cnode rounded-xl px-4 py-3 min-w-[160px] max-w-[240px]
        border-2 transition-all duration-200 cursor-pointer
        ${cfg.bg} ${cfg.ring}
        ${selected
          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
          : 'shadow-lg hover:shadow-xl hover:brightness-110'}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !border-slate-600 !bg-slate-400 opacity-40"
      />

      <div className="flex items-center gap-2 mb-1">
        <span className={`${cfg.badge} text-white text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded shrink-0 uppercase`}>
          {cfg.text}
        </span>
        <span
          className="text-slate-100 text-[13px] font-semibold truncate"
          title={data?.label}
        >
          {data?.label}
        </span>
      </div>

      {data?.path && (
        <p
          className="text-slate-400 text-[10px] truncate mt-0.5"
          title={data.path}
        >
          {data.path}
        </p>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !border-slate-600 !bg-slate-400 opacity-40"
      />
    </div>
  )
}

export default memo(CustomNode)
