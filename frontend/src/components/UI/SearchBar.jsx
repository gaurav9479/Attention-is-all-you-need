export default function SearchBar({ search, setSearch }) {
  return (
    <div className="absolute top-4 left-4 z-10 w-72">
      <input
        type="text"
        placeholder="Search nodes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-500 shadow-lg"
      />
    </div>
  );
}
