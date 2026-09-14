import { supabase } from "../supabaseClient";
import { fetchUserAccess, canAccessScreenFromAccess } from "./permissionService";

export const currentUser = () => ({
  username: (localStorage.getItem("username") || "").trim().toLocaleLowerCase("tr-TR"),
  name: localStorage.getItem("ad") || localStorage.getItem("username") || "Kullanıcı",
  role: localStorage.getItem("role") || "user"
});
export const isAdmin = () => currentUser().username === "admin";
const todayKey = () => new Date().toISOString().slice(0,10);
const addDays = (n) => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };

export const NOTIFICATION_SOURCES = [
  { key:"hedef_kargo", label:"Hedef Kargo", description:"Geciken ve beklenen teslim bildirimleri", path:"/hedef-kargo" },
  { key:"tahakkuk", label:"Tahakkuk", description:"Yaklaşan ödeme ve tahakkuk kontrolleri", path:"/tahakkuk" },
  { key:"kargo", label:"Kargo / Eksik Evrak", description:"Eksik irsaliye ve kargo evrak kontrolleri", path:"/tum-kargo-bilgileri" },
  { key:"evrak", label:"Evrak", description:"Evrak kaynaklı operasyon bildirimleri", path:"/toplu-evraklar" },
  { key:"ticket", label:"Ticket", description:"Ticket bildirimleri", path:"/ticket-yonetimi" },
  { key:"announcement", label:"Admin Duyuruları", description:"Yönetici tarafından yayınlanan duyurular", path:null },
  { key:"task", label:"Genel Görevler", description:"Belirli bir ekrana bağlı olmayan görev bildirimleri", path:"/gorev-merkezi" }
];

const defaultNotificationPreferences = () =>
  Object.fromEntries(NOTIFICATION_SOURCES.map((source) => [source.key, true]));

const sourceKeyFromItem = (item) => {
  if (item?.source_key) return item.source_key;
  if (item?.type === "announcement") return "announcement";
  if (item?.type === "ticket") return "ticket";
  const source = String(item?.source_type || "").toLocaleLowerCase("tr-TR");
  if (source === "hedef_kargo") return "hedef_kargo";
  if (source === "tahakkuk") return "tahakkuk";
  if (source === "kargo" || source === "kargo_bilgileri") return "kargo";
  if (source === "evrak" || source === "evraklar") return "evrak";
  const path = String(item?.action_path || "");
  if (path.includes("hedef-kargo")) return "hedef_kargo";
  if (path.includes("tahakkuk")) return "tahakkuk";
  if (path.includes("kargo")) return "kargo";
  if (path.includes("evrak")) return "evrak";
  if (path.includes("ticket")) return "ticket";
  return "task";
};

const hasNotificationContent = (item) =>
  Boolean(String(item?.title || "").trim() || String(item?.message || item?.description || "").trim());
const sourcePathForKey = (key) =>
  NOTIFICATION_SOURCES.find((source) => source.key === key)?.path || null;

const canSeeSourceWithAccess = (access, item) => {
  const path = sourcePathForKey(sourceKeyFromItem(item));
  return !path || canAccessScreenFromAccess(access, path);
};

export async function fetchNotificationPreferences() {
  const u = currentUser();
  const defaults = defaultNotificationPreferences();
  if (!u.username) return defaults;

  const { data, error } = await supabase
    .from("app_notification_preferences")
    .select("sources")
    .eq("username", u.username)
    .maybeSingle();

  if (error) {
    console.warn("Bildirim tercihleri okunamadı:", error.message);
    return defaults;
  }
  return { ...defaults, ...(data?.sources || {}) };
}

export async function saveNotificationPreferences(sources) {
  const u = currentUser();
  if (!u.username) return defaultNotificationPreferences();

  const normalized = { ...defaultNotificationPreferences(), ...(sources || {}) };
  const { error } = await supabase
    .from("app_notification_preferences")
    .upsert({
      username: u.username,
      sources: normalized,
      updated_at: new Date().toISOString()
    }, { onConflict: "username" });

  if (error) throw error;
  window.dispatchEvent(new CustomEvent("notifications:preferences-changed", { detail: normalized }));
  return normalized;
}

export async function fetchAvailableNotificationSources() {
  const u = currentUser();
  const access = await fetchUserAccess(u.username);
  return NOTIFICATION_SOURCES.filter((source) => {
    if (!source.path) return true;
    return canAccessScreenFromAccess(access, source.path);
  });
}

export async function logAudit(action, entityType, entityId="", oldData=null, newData=null, screenPath="", metadata=null) {
  const u=currentUser();
  await supabase.from("app_audit_logs").insert([{username:u.username,display_name:u.name,action,entity_type:entityType,entity_id:String(entityId||""),screen_path:screenPath,old_data:oldData,new_data:newData,metadata}]);
  await touchActivity(action);
}
export async function touchActivity(action="view", login=false) {
  const u=currentUser(); if(!u.username) return;
  const {data}=await supabase.from("app_user_activity").select("*").eq("username",u.username).maybeSingle();
  const today=todayKey(), same=data?.action_count_date===today;
  const payload={username:u.username,display_name:u.name,role:u.role,last_seen_at:new Date().toISOString(),last_action_at:new Date().toISOString(),today_action_count:(same?Number(data?.today_action_count||0):0)+(action==="heartbeat"?0:1),action_count_date:today,updated_at:new Date().toISOString()};
  if(login) payload.last_login_at=new Date().toISOString();
  await supabase.from("app_user_activity").upsert(payload,{onConflict:"username"});
}
export async function fetchNotifications() {
  const u = currentUser();
  const now = new Date().toISOString();

  await syncAutomaticTasks();

  const [access, preferences, notesResult, readsResult, announcementsResult, ticketsResult, tasksResult] = await Promise.all([
    fetchUserAccess(u.username),
    fetchNotificationPreferences(),
    supabase.from("app_notifications").select("*").or(`target_username.is.null,target_username.eq.${u.username}`).order("created_at",{ascending:false}).limit(60),
    supabase.from("app_read_items").select("item_key").eq("username",u.username),
    supabase.from("app_announcements").select("*").eq("active",true).lte("starts_at",now).order("created_at",{ascending:false}).limit(30),
    u.username === "admin"
      ? supabase.from("support_tickets").select("id,ticket_no,title,status,created_at").eq("status","new").order("created_at",{ascending:false}).limit(20)
      : Promise.resolve({ data: [] }),
    supabase.from("app_tasks").select("*").in("status",["open","in_progress"]).order("due_date",{ascending:true}).limit(60)
  ]);

  const notes = notesResult.data || [];
  const reads = readsResult.data || [];
  const ann = announcementsResult.data || [];
  const tickets = ticketsResult.data || [];
  const tasks = tasksResult.data || [];
  const readSet = new Set(reads.map((x) => x.item_key));

  const announcements = ann
    .filter((a) => !a.expires_at || a.expires_at > now)
    .filter((a) =>
      a.target_type === "all" ||
      (a.target_type === "user" && a.target_value === u.username) ||
      (a.target_type === "role" && a.target_value === u.role)
    )
    .map((a) => ({
      ...a,
      id: `ann-${a.id}`,
      type: "announcement",
      source_key: "announcement",
      source_id: a.id,
      read: readSet.has(`ann-${a.id}`)
    }));

  const ticketNotes = tickets.map((t) => ({
    id: `ticket-${t.id}`,
    title: `Yeni Ticket • ${t.ticket_no}`,
    message: t.title,
    type: "ticket",
    source_key: "ticket",
    priority: "high",
    action_path: "/ticket-yonetimi",
    created_at: t.created_at,
    read: readSet.has(`ticket-${t.id}`)
  }));

  const taskNotes = tasks
    .filter((t) => !t.assigned_to || t.assigned_to === u.username || u.username === "admin")
    .map((t) => ({
      id: `task-${t.id}`,
      title: t.title,
      message: t.description,
      type: "task",
      source_type: t.source_type,
      source_key: sourceKeyFromItem(t),
      priority: t.priority,
      action_path: t.action_path || "/gorev-merkezi",
      created_at: t.created_at,
      read: readSet.has(`task-${t.id}`)
    }));

  const rawItems = [
    ...notes
      .filter((n) => !n.expires_at || n.expires_at > now)
      .filter((n) => !n.target_username || String(n.target_username).toLocaleLowerCase("tr-TR") === u.username)
      .filter((n) => !n.target_role || String(n.target_role).toLocaleLowerCase("tr-TR") === String(u.role || "").toLocaleLowerCase("tr-TR"))
      .map((n) => ({ ...n, source_key: sourceKeyFromItem(n), read: readSet.has(String(n.id)) })),
    ...announcements,
    ...ticketNotes,
    ...taskNotes
  ];

  return rawItems
    // Boş/işe yaramayan bildirimleri tamamen çıkar.
    .filter(hasNotificationContent)
    // Kullanıcının kendi tercihi kapalıysa gösterme.
    .filter((item) => preferences?.[sourceKeyFromItem(item)] !== false)
    // Kullanıcının kaynak ekranına erişim yetkisi yoksa bildirim kesinlikle gösterme.
    .filter((item) => canSeeSourceWithAccess(access, item))
    .sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}
export async function markNotificationRead(id) {
  const u=currentUser(); await supabase.from("app_read_items").upsert({item_key:String(id),username:u.username},{onConflict:"item_key,username"});
}
export async function createAnnouncement(payload) {
  const u=currentUser(); const {error}=await supabase.from("app_announcements").insert([{...payload,created_by:u.username}]); if(error) throw error;
  await logAudit("Duyuru yayınladı","announcement","",null,payload,"/yonetim-paneli");
}
export async function syncAutomaticTasks() {
  const u=currentUser(); if(!u.username) return;
  const sevenAgo=addDays(-7), tomorrow=addDays(1);
  const [{data:pending},{data:due},{data:missing}] = await Promise.all([
    supabase.from("hedef_kargo").select("id,tarih,gonderici,tedarikci,beklenen_teslim_tarihi").is("teslim_tarihi",null).or(`tarih.lte.${sevenAgo},beklenen_teslim_tarihi.lte.${todayKey()}`).limit(250),
    supabase.from("tahakkuk").select("id,tedarikci_firma,odeme_gunu,durum").eq("odeme_gunu",tomorrow).limit(250),
    supabase.from("kargo_bilgileri").select("id,tarih,kargo_firmasi,gonderen_firma,irsaliye_no").or("irsaliye_no.is.null,irsaliye_no.eq.").limit(250)
  ]);
  const tasks=[];
  (pending||[]).forEach(x=>{const planned=x.beklenen_teslim_tarihi;const dueToday=planned===todayKey();tasks.push({task_key:`hedef-${x.id}-${planned||"7d"}`,title:dueToday?"Bugün teslim edilmesi gereken kargo":"Geciken Hedef Kargo kontrolü",description:`${x.gonderici||x.tedarikci||"Kargo"} • ${planned?`beklenen teslim ${planned}`:"7+ gündür teslim edilmedi"}`,source_type:"hedef_kargo",source_id:String(x.id),action_path:"/hedef-kargo",priority:"high",due_date:planned||todayKey()})});
  (due||[]).filter(x=>String(x.durum||"").toLowerCase()!=="odendi").forEach(x=>tasks.push({task_key:`tahakkuk-${x.id}-${x.odeme_gunu}`,title:"Tahakkuk ödeme kontrolü",description:`${x.tedarikci_firma||"Firma"} • ödeme tarihi yarın`,source_type:"tahakkuk",source_id:String(x.id),action_path:"/tahakkuk",priority:"high",due_date:x.odeme_gunu}));
  (missing||[]).forEach(x=>tasks.push({task_key:`kargo-missing-${x.id}`,title:"Eksik kargo evrakı",description:`${x.kargo_firmasi||x.gonderen_firma||"Kargo"} • irsaliye numarası eksik`,source_type:"kargo",source_id:String(x.id),action_path:"/tum-kargo-bilgileri",priority:"normal",due_date:todayKey()}));
  if(tasks.length) await supabase.from("app_tasks").upsert(tasks,{onConflict:"task_key",ignoreDuplicates:true});
}
export async function fetchTasks() {
  await syncAutomaticTasks();
  const u=currentUser();
  const [access,{data,error}] = await Promise.all([
    fetchUserAccess(u.username),
    supabase.from("app_tasks").select("*").order("status").order("due_date",{ascending:true})
  ]);
  if(error) throw error;
  return (data||[]).filter((task) => canSeeSourceWithAccess(access, task));
}
export async function updateTask(id,patch) { const u=currentUser(); const next={...patch,updated_at:new Date().toISOString()}; if(patch.status==="done") next.completed_at=new Date().toISOString(); const {error}=await supabase.from("app_tasks").update(next).eq("id",id); if(error) throw error; await logAudit("Görev güncelledi","task",id,null,next,"/gorev-merkezi"); }
export async function claimTask(id) { return updateTask(id,{assigned_to:currentUser().username,status:"in_progress"}); }

export async function globalSearch(q) {
  const term=String(q||"").trim(); if(term.length<2) return [];
  const safe=`%${term}%`;
  const calls=[
    supabase.from("kargo_bilgileri").select("id,kargo_firmasi,gonderen_firma,irsaliye_no,tarih").or(`kargo_firmasi.ilike.${safe},gonderen_firma.ilike.${safe},irsaliye_no.ilike.${safe}`).limit(20),
    supabase.from("tahakkuk").select("id,tedarikci_firma,odeme_gunu,durum").ilike("tedarikci_firma",safe).limit(20),
    supabase.from("lokasyonlar").select("*").ilike("lokasyon",safe).limit(20),
    supabase.from("projeler").select("*").ilike("proje",safe).limit(20),
    supabase.from("evrakseferler").select("id,evrakid,seferno,aciklama").or(`seferno.ilike.${safe},aciklama.ilike.${safe}`).limit(20),
    supabase.from("hedef_kargo").select("id,gonderici,tedarikci,teslim_edilen_kisi,teslim_tarihi").or(`gonderici.ilike.${safe},tedarikci.ilike.${safe},teslim_edilen_kisi.ilike.${safe}`).limit(20)
  ];
  const [k,t,l,p,e,h]=await Promise.all(calls);
  const out=[];
  (k.data||[]).forEach(x=>out.push({group:"Kargo",title:x.kargo_firmasi||x.gonderen_firma||"Kargo",subtitle:x.irsaliye_no||x.gonderen_firma||"",path:"/tum-kargo-bilgileri",id:x.id}));
  (t.data||[]).forEach(x=>out.push({group:"Tahakkuk",title:x.tedarikci_firma,subtitle:`${x.odeme_gunu||""} • ${x.durum||""}`,path:"/tahakkuk",id:x.id}));
  (l.data||[]).forEach(x=>out.push({group:"Lokasyon",title:x.lokasyon||"Lokasyon",subtitle:"Lokasyon kaydı",path:"/lokasyonlar",id:x.id}));
  (p.data||[]).forEach(x=>out.push({group:"Proje",title:x.proje||"Proje",subtitle:"Proje kaydı",path:"/projeler",id:x.id}));
  (e.data||[]).forEach(x=>out.push({group:"Evrak",title:x.seferno||`Evrak #${x.evrakid}`,subtitle:x.aciklama||"Sefer / evrak kaydı",path:"/toplu-evraklar",id:x.evrakid}));
  (h.data||[]).forEach(x=>out.push({group:"Hedef Kargo",title:x.gonderici||x.tedarikci||"Hedef Kargo",subtitle:`${x.tedarikci||""} ${x.teslim_edilen_kisi||""}`.trim(),path:"/hedef-kargo",id:x.id}));
  return out;
}
export async function fetchAudit(limit=400) { const {data,error}=await supabase.from("app_audit_logs").select("*").order("created_at",{ascending:false}).limit(limit); if(error) throw error; return data||[]; }
export async function fetchActivities() { const {data,error}=await supabase.from("app_user_activity").select("*").order("last_seen_at",{ascending:false}); if(error) throw error; return data||[]; }
export async function fetchCalendar(start,end) {
  const u=currentUser();
  const [access,{data:custom},{data:tah},{data:tasks}] = await Promise.all([
    fetchUserAccess(u.username),
    supabase.from("app_calendar_events").select("*").gte("event_date",start).lte("event_date",end),
    supabase.from("tahakkuk").select("id,tedarikci_firma,odeme_gunu,durum").gte("odeme_gunu",start).lte("odeme_gunu",end),
    supabase.from("app_tasks").select("*").gte("due_date",start).lte("due_date",end).neq("status","cancelled")
  ]);
  const canTahakkuk=canAccessScreenFromAccess(access,"/tahakkuk");
  return [
    ...(custom||[]).filter((x)=>!x.action_path || canAccessScreenFromAccess(access,x.action_path)).map(x=>({...x,kind:"event"})),
    ...(canTahakkuk ? (tah||[]) : []).map(x=>({id:`t-${x.id}`,title:`Tahakkuk • ${x.tedarikci_firma}`,event_date:x.odeme_gunu,event_type:"tahakkuk",description:x.durum,action_path:"/tahakkuk",kind:"tahakkuk"})),
    ...(tasks||[]).filter((x)=>canSeeSourceWithAccess(access,x)).map(x=>({id:`g-${x.id}`,title:x.title,event_date:x.due_date,event_type:"task",description:x.description,action_path:x.action_path,kind:"task"}))
  ];
}
