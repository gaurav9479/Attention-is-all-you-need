import { useState } from "react";

const FileIcon = ({ type }) => {
  if (type === "directory") return <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
  return <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
};

const TreeItem = ({ item, onSelect, selectedPath, search }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedPath === item.fullPath;
  const isMatch = !search || item.name.toLowerCase().includes(search.toLowerCase());

  if (item.type === "directory") {
     const hasMatchingChildren = item.children?.some(child => 
        child.name.toLowerCase().includes(search.toLowerCase()) || 
        (child.type === "directory" && true)
     );
     if (!isMatch && !hasMatchingChildren) return null;

     return (
       <div className="pl-3">
         <div 
           onClick={() => setIsOpen(!isOpen)}
           className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-slate-800/50 cursor-pointer text-slate-300 text-sm transition-colors"
         >
           <span className="w-4 h-4 flex items-center justify-center text-slate-600">
             {isOpen ? "▾" : "▸"}
           </span>
           <FileIcon type="directory" />
           <span className="truncate">{item.name}</span>
         </div>
         {isOpen && item.children?.map((child, i) => (
           <TreeItem key={i} item={child} onSelect={onSelect} selectedPath={selectedPath} search={search} />
         ))}
       </div>
     );
  }

  if (!isMatch) return null;

  return (
    <div 
      onClick={() => onSelect(item)}
      className={`flex items-center gap-2 py-1 px-3 ml-7 rounded-md cursor-pointer text-[13px] transition-all group ${isSelected ? "bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-900/10" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"}`}
    >
      <FileIcon type="file" />
      <span className="truncate flex-1">{item.name}</span>
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-900/40 group-hover:scale-110 transition-transform"></div>
    </div>
  );
};

export default function SidebarLeft({ tree, onSelect, selectedPath }) {
  const [search, setSearch] = useState("");

  if (!tree) return (
     <aside className="w-[280px] h-full border-r border-slate-800 bg-slate-900/30 flex items-center justify-center text-slate-600 text-xs italic">
       No repository loaded.
     </aside>
  );

  return (
    <aside className="w-[280px] h-full border-r border-slate-800 bg-slate-900/30 flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-slate-800 shrink-0">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-8 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 transition-all font-medium"
          />
          <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-800 custom-scrollbar">
        <TreeItem item={tree} onSelect={onSelect} selectedPath={selectedPath} search={search} />
      </div>
    </aside>
  );
}
