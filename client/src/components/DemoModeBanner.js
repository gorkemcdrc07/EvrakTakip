import React from "react";
import { FlaskConical, LogOut } from "lucide-react";
import { isDemoMode } from "../supabaseClient";

export default function DemoModeBanner(){
  if(!isDemoMode()) return null;
  const exit=()=>{localStorage.removeItem("ets_demo_mode");localStorage.removeItem("ets_demo_database_v1");window.location.reload()};
  return <div className="sticky top-0 z-[20050] flex h-8 items-center justify-center gap-3 border-b border-amber-400/20 bg-amber-400 text-[10px] font-black tracking-[.14em] text-slate-950 shadow-sm">
    <FlaskConical size={13}/>
    PORTFOLIO DEMO · SYNTHETIC DATA
    <button onClick={exit} className="ml-2 inline-flex items-center gap-1 rounded-md bg-slate-950/10 px-2 py-1 tracking-normal hover:bg-slate-950/20"><LogOut size={11}/>Demo'dan Çık</button>
  </div>
}