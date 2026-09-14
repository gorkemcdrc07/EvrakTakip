const cron = require("node-cron");
const nodemailer = require("nodemailer");
const axios = require("axios");

function startReportScheduler() {
  const base = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    console.warn("[Rapor Merkezi] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok; zamanlayıcı pasif.");
    return;
  }
  const api = axios.create({ baseURL: `${base}/rest/v1`, headers: { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json" } });
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.office365.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const dateKey=d=>d.toISOString().slice(0,10);
  const dueNow=(s,now)=>s.active && Number(s.hour)===now.getHours() && (s.frequency==="daily" || Number(s.weekday)===now.getDay()) && (!s.last_run_at || new Date(s.last_run_at).toDateString()!==now.toDateString());
  const count = async (table, query="") => {
    const r=await api.get(`/${table}?select=id${query}`,{headers:{Prefer:"count=exact"},validateStatus:x=>x<400});
    const cr=r.headers["content-range"]||""; const m=cr.match(/\/(\d+)$/); return m?Number(m[1]):Array.isArray(r.data)?r.data.length:0;
  };
  cron.schedule("* * * * *", async () => {
    try {
      const {data:schedules}=await api.get("/app_report_schedules?select=*&active=eq.true");
      const now=new Date();
      for(const s of schedules||[]) {
        if(!dueNow(s,now)||!(s.recipients||[]).length) continue;
        const end=dateKey(now), startDate=new Date(now); startDate.setDate(startDate.getDate()-(s.frequency==="weekly"?7:1)); const start=dateKey(startDate);
        const [kargo,evrak,tah]=await Promise.all([
          s.include_kargo?count("kargo_bilgileri",`&tarih=gte.${start}&tarih=lte.${end}`):0,
          s.include_evrak?count("evraklar",`&tarih=gte.${start}&tarih=lte.${end}`):0,
          s.include_tahakkuk?count("tahakkuk",`&tarih=gte.${start}&tarih=lte.${end}`):0
        ]);
        if(!process.env.SMTP_USER||!process.env.SMTP_PASS) throw new Error("SMTP_USER / SMTP_PASS eksik");
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to:s.recipients.join(","),
          subject:`${s.name} • ${start} - ${end}`,
          html:`<div style="font-family:Arial;padding:24px"><h2>${s.name}</h2><p>${start} – ${end} operasyon özeti</p><table cellpadding="12" style="border-collapse:collapse"><tr><td><b>Kargo kaydı</b></td><td>${kargo}</td></tr><tr><td><b>Evrak kaydı</b></td><td>${evrak}</td></tr><tr><td><b>Tahakkuk kaydı</b></td><td>${tah}</td></tr></table><p style="color:#64748b">ODAK Evrak Takip Sistemi tarafından otomatik oluşturuldu.</p></div>`
        });
        await api.patch(`/app_report_schedules?id=eq.${s.id}`,{last_run_at:now.toISOString()},{headers:{Prefer:"return=minimal"}});
      }
    } catch(err) { console.error("[Rapor Merkezi]",err.response?.data||err.message); }
  }, { timezone:"Europe/Istanbul" });
  console.log("[Rapor Merkezi] Otomatik e-posta zamanlayıcısı aktif.");
}
module.exports={startReportScheduler};
