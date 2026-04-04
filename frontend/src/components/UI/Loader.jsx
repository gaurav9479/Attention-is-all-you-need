export default function Loader({ text = "Loading..." }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin"></div>
        <p className="text-slate-400 text-sm">{text}</p>
      </div>
    </div>
  );
}
