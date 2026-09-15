const trDate = (date) => date.toISOString().slice(0, 10);
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return trDate(d); };
const addHoursIso = (hours) => { const d = new Date(); d.setHours(d.getHours() + hours); return d.toISOString(); };

const firms = [
  "ATLAS DAĞITIM A.Ş.", "MARMARA LOJİSTİK", "NOVA PERAKENDE", "KUZEY TAŞIMACILIK",
  "PUSULA TEDARİK", "ROTA EXPRESS", "MAVİ HAT LOJİSTİK", "VEKTÖR DAĞITIM",
  "DELTA TEDARİK", "ARMA OPERASYON", "BETA LOJİSTİK", "ZENİT TAŞIMACILIK"
];
const cargoFirms = ["ARAS KARGO", "YURTİÇİ KARGO", "MNG KARGO", "SÜRAT KARGO", "UPS", "DHL"];
const locations = ["İSTANBUL AVRUPA", "İSTANBUL ANADOLU", "KOCAELİ", "BURSA", "ANKARA", "İZMİR", "AFYON", "KONYA"];
const projects = ["PERAKENDE DAĞITIM", "BÖLGE TRANSFER", "E-TİCARET", "MAĞAZA SEVKİ", "DEPO TRANSFER", "EXPRESS"];

const pick = (arr, i) => arr[i % arr.length];
const money = (i) => 18000 + ((i * 17350) % 420000);

const lokasyonlar = locations.map((lokasyon, i) => ({ id: i + 1, lokasyon }));
const projeler = projects.map((proje, i) => ({ id: i + 1, proje }));
const firmalar = firms.map((firma, i) => ({ id: i + 1, firma, unvan:firma, vkn: `999999${String(i+1).padStart(4,"0")}`, tc:null, kod:`DM${String(i+1).padStart(3,"0")}`, telefon:`0500 000 ${String(1000+i).slice(-4)}`, "ıban":`TR00 0000 0000 0000 0000 ${String(1000+i).padStart(4,"0")}` }));

const evraklar = Array.from({ length: 54 }, (_, i) => ({
  id: i + 1,
  tarih: addDays(-(i % 24)),
  lokasyonid: (i % locations.length) + 1,
  sefersayisi: 1 + (i % 4)
}));
const evrakseferler = evraklar.flatMap((e) =>
  Array.from({ length: e.sefersayisi }, (_, j) => ({
    id: e.id * 10 + j,
    evrakid: e.id,
    seferno: `SFR-DEMO-${String(e.id).padStart(4,"0")}-${j+1}`,
    aciklama: j % 3 === 0 ? "Teslim evrakı kontrol edildi" : "Operasyon demo kaydı"
  }))
);
const evrakproje = evraklar.flatMap((e) => [{
  id: e.id,
  evrakid: e.id,
  projeid: (e.id % projects.length) + 1,
  sefersayisi: e.sefersayisi
}]);

const kargo_bilgileri = Array.from({ length: 136 }, (_, i) => ({
  id: i + 1,
  tarih: addDays(-(i % 30)),
  kargo_firmasi: pick(cargoFirms, i),
  gonderi_numarasi: `GND-DEMO-${String(100000+i)}`,
  gonderen_firma: pick(firms, i + 2),
  irsaliye_adi: i % 5 === 0 ? "SEVK İRSALİYESİ" : "KARGO İRSALİYESİ",
  irsaliye_no: i % 17 === 0 ? null : `IRS-DEMO-${String(202600000+i)}`,
  odak_evrak_no: `ODK-DEMO-${String(5000+i)}`,
  evrak_adedi: 1 + (i % 6)
}));

const hedef_kargo = Array.from({ length: 92 }, (_, i) => {
  const delivered = i % 4 !== 0;
  const base = -(i % 21);
  return {
    id: i + 1,
    tarih: addDays(base),
    gonderici: pick(firms, i),
    tedarikci: pick(firms, i + 4),
    teslim_edilen_kisi: delivered ? pick(["AYŞE YILMAZ","MEHMET KAYA","ELİF DEMİR","CAN AYDIN","SELİN AKSOY"], i) : null,
    beklenen_teslim_tarihi: addDays(base + 3),
    teslim_tarihi: delivered ? addDays(base + 2 + (i % 3)) : null
  };
});

const tahakkuk = Array.from({ length: 48 }, (_, i) => {
  const dueOffset = (i % 17) - 5;
  const paid = i % 5 === 0;
  return {
    id: i + 1,
    tedarikci_firma: pick(firms, i),
    tarih: addDays(-((i + 3) % 16)),
    odeme_gunu: addDays(dueOffset),
    aciklama: pick(["AYLIK HİZMET BEDELİ","NAKLİYE HİZMETİ","DEPO OPERASYONU","EK SEFER BEDELİ","DAĞITIM HİZMETİ"], i),
    durum: paid ? "odendi" : "odenecek",
    workflow_status: paid ? "odendi" : pick(["taslak","kontrol_bekliyor","onaylandi","odeme_bekliyor"], i),
    tutar: money(i),
    olusturan_kullanici: pick(["Ayşe Yılmaz","Mehmet Kaya","Elif Demir","Can Aydın"], i),
    olusturulma_tarihi: addHoursIso(-(i * 6 + 2)),
    guncelleyen_kullanici: i % 3 === 0 ? "Demo Admin" : null,
    guncelleme_tarihi: i % 3 === 0 ? addHoursIso(-(i * 2 + 1)) : null,
    son_islem: paid ? "ÖDENDİ YAPILDI" : "DEMO KAYDI"
  };
});

const support_tickets = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  ticket_no: `TCK-DEMO-${String(100+i)}`,
  title: pick(["Excel çıktısında sütun sırası","Tahakkuk tarihi kontrolü","Kargo kaydı eşleşme sorunu","PDF yükleme testi","Yetki talebi"], i),
  description: "Portföy demo modu için oluşturulmuş sentetik ticket kaydı.",
  status: pick(["new","in_progress","resolved"], i),
  priority: pick(["normal","high","low"], i),
  created_by_username: pick(["ayse.demo","mehmet.demo","elif.demo"], i),
  created_by_name: pick(["Ayşe Yılmaz","Mehmet Kaya","Elif Demir"], i),
  assigned_admin: i % 2 === 0 ? "admin" : null,
  created_at: addHoursIso(-(i * 4 + 1)),
  updated_at: addHoursIso(-(i * 2))
}));

const app_tasks = [
  { id:"task-demo-1", task_key:"demo-tah-1", title:"Gecikmiş Tahakkuk", description:"ATLAS DAĞITIM • ödeme tarihi geçti", source_type:"tahakkuk", source_id:"2", action_path:"/tahakkuk?recordId=2", priority:"critical", due_date:addDays(-2), status:"open", assigned_to:"mehmet.demo", created_by:"system", created_at:addHoursIso(-20), updated_at:addHoursIso(-20) },
  { id:"task-demo-2", task_key:"demo-hk-1", title:"Bugün teslim edilmesi gereken kargo", description:"NOVA PERAKENDE • teslim kontrolü", source_type:"hedef_kargo", source_id:"5", action_path:"/hedef-kargo?recordId=5", priority:"high", due_date:addDays(0), status:"in_progress", assigned_to:"ayse.demo", created_by:"system", created_at:addHoursIso(-8), updated_at:addHoursIso(-3) },
  { id:"task-demo-3", task_key:"demo-kargo-1", title:"Eksik kargo evrakı", description:"MNG KARGO • irsaliye numarası eksik", source_type:"kargo", source_id:"18", action_path:"/tum-kargo-bilgileri?recordId=18", priority:"normal", due_date:addDays(0), status:"open", assigned_to:null, created_by:"system", created_at:addHoursIso(-5), updated_at:addHoursIso(-5) },
  { id:"task-demo-4", task_key:"demo-done", title:"Tahakkuk ödeme kontrolü", description:"MARMARA LOJİSTİK • kontrol tamamlandı", source_type:"tahakkuk", source_id:"6", action_path:"/tahakkuk?recordId=6", priority:"high", due_date:addDays(-1), status:"done", assigned_to:"elif.demo", created_by:"system", created_at:addHoursIso(-35), updated_at:addHoursIso(-10), completed_at:addHoursIso(-10) }
];

const app_notifications = [
  {id:"note-demo-1",type:"info",title:"Tahakkuk ödeme tarihi yaklaşıyor",message:"ATLAS DAĞITIM tahakkukunun ödeme tarihi yarın.",target_username:null,target_role:null,source_type:"tahakkuk",source_id:"2",action_path:"/tahakkuk?recordId=2",priority:"high",created_at:addHoursIso(-1)},
  {id:"note-demo-2",type:"info",title:"Teslimat kontrolü",message:"NOVA PERAKENDE gönderisi bugün teslim edilmeli.",target_username:null,target_role:null,source_type:"hedef_kargo",source_id:"5",action_path:"/hedef-kargo?recordId=5",priority:"high",created_at:addHoursIso(-2)}
];

const app_announcements = [
  {id:"ann-demo-1",title:"Yeni evrak süreci",message:"Demo ortamında yeni evrak akışı devreye alınmıştır.",target_type:"all",target_value:null,priority:"normal",action_path:"/anasayfa",created_by:"admin",starts_at:addHoursIso(-12),created_at:addHoursIso(-12),active:true}
];

const app_audit_logs = [
  {id:1,username:"ayse.demo",display_name:"Ayşe Yılmaz",action:"Tahakkuk kaydı oluşturdu",entity_type:"tahakkuk",entity_id:"2",screen_path:"/tahakkuk",old_data:null,new_data:{durum:"odenecek",odeme_gunu:addDays(1)},created_at:addHoursIso(-6)},
  {id:2,username:"mehmet.demo",display_name:"Mehmet Kaya",action:"Ödeme tarihini değiştirdi",entity_type:"tahakkuk",entity_id:"3",screen_path:"/tahakkuk",old_data:{odeme_gunu:addDays(2)},new_data:{odeme_gunu:addDays(3)},created_at:addHoursIso(-4)},
  {id:3,username:"elif.demo",display_name:"Elif Demir",action:"Kargo kaydı ekledi",entity_type:"kargo_bilgileri",entity_id:"18",screen_path:"/kargo-bilgisi-ekle",old_data:null,new_data:{kargo_firmasi:"MNG KARGO"},created_at:addHoursIso(-3)},
  {id:4,username:"admin",display_name:"Demo Admin",action:"Kullanıcı/yetki güncelledi",entity_type:"user_access",entity_id:"ayse.demo",screen_path:"/yonetim-paneli",old_data:{role:"user"},new_data:{role:"operator"},created_at:addHoursIso(-2)}
];

const app_user_activity = [
  {username:"admin",display_name:"Demo Admin",role:"admin",last_login_at:addHoursIso(-3),last_seen_at:addHoursIso(-0.02),last_action_at:addHoursIso(-0.05),today_action_count:34,action_count_date:trDate(new Date())},
  {username:"ayse.demo",display_name:"Ayşe Yılmaz",role:"operator",last_login_at:addHoursIso(-5),last_seen_at:addHoursIso(-0.2),last_action_at:addHoursIso(-0.3),today_action_count:22,action_count_date:trDate(new Date())},
  {username:"mehmet.demo",display_name:"Mehmet Kaya",role:"finance",last_login_at:addHoursIso(-6),last_seen_at:addHoursIso(-1.4),last_action_at:addHoursIso(-1.5),today_action_count:17,action_count_date:trDate(new Date())},
  {username:"elif.demo",display_name:"Elif Demir",role:"operator",last_login_at:addHoursIso(-4),last_seen_at:addHoursIso(-2.1),last_action_at:addHoursIso(-2.2),today_action_count:13,action_count_date:trDate(new Date())}
];

const login = [
  {id:1,kullaniciAdi:"admin",kullanici:"Demo Admin",sifre:"demo"},
  {id:2,kullaniciAdi:"ayse.demo",kullanici:"Ayşe Yılmaz",sifre:"demo"},
  {id:3,kullaniciAdi:"mehmet.demo",kullanici:"Mehmet Kaya",sifre:"demo"},
  {id:4,kullaniciAdi:"elif.demo",kullanici:"Elif Demir",sifre:"demo"}
];

const app_user_access = login.map((u) => ({
  username:u.kullaniciAdi,
  role:u.kullaniciAdi==="admin"?"admin":"user",
  active:true,
  screen_permissions:{},
  action_permissions:{},
  updated_at:new Date().toISOString()
}));

const app_report_schedules = [
  {id:"report-demo-1",name:"Haftalık Operasyon Özeti",frequency:"weekly",weekday:1,hour:8,recipients:["demo@example.com"],include_kargo:true,include_evrak:true,include_tahakkuk:true,active:true,created_by:"admin",created_at:addHoursIso(-24)}
];

const app_calendar_events = [
  {id:"cal-demo-1",title:"Aylık Operasyon Değerlendirmesi",event_date:addDays(3),event_type:"meeting",description:"Demo operasyon toplantısı",action_path:"/anasayfa",created_by:"admin",created_at:addHoursIso(-30)}
];

export const DEMO_SEED = {
  lokasyonlar, projeler, firmalar, evraklar, evrakseferler, evrakproje,
  kargo_bilgileri, hedef_kargo, tahakkuk, support_tickets,
  app_tasks, app_notifications, app_announcements, app_audit_logs,
  app_user_activity, login, app_user_access, app_report_schedules,
  app_calendar_events,
  app_notification_preferences: [],
  app_read_items: [],
  app_record_follows: [],
  app_record_notes: [],
  app_record_files: [],
  app_notification_snoozes: []
};

export const cloneDemoSeed = () => JSON.parse(JSON.stringify(DEMO_SEED));
