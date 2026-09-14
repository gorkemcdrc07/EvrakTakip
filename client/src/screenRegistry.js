import Anasayfa from "./Anasayfa";
import Lokasyonlar from "./Lokasyonlar";
import Projeler from "./Projeler";
import TopluEvraklar from "./TopluEvraklar";
import EvrakEkle from "./EvrakEkle";
import KargoBilgisiEkle from "./KargoBilgisiEkle";
import TumKargoBilgileri from "./TumKargoBilgileri";
import Tutanak from "./Tutanak";
import Raporlar from "./Raporlar";
import HedefKargo from "./hedefKargo";
import EvrakRaporlari from "./EvrakRaporlari";
import ExcelDonusum from "./ExcelDonusum";
import TopluTutanak from "./TopluTutanak";
import Tahakkuk from "./Tahakkuk";
import TahakkukTakip from "./pages/TahakkukTakip";
import JpgToPdf from "./pages/JpgToPdf";
import PdfSikistirma from "./pages/PdfSikistirma";
import MusteriEvraklari from "./pages/musteriEvraklari";
import TicketAdmin from "./pages/TicketAdmin";
import AdminPanel from "./pages/AdminPanel";
import TaskCenter from "./pages/TaskCenter";
import AuditLog from "./pages/AuditLog";
import OperationCalendar from "./pages/OperationCalendar";
import ReportCenter from "./pages/ReportCenter";


export const screenRegistry = {
    "/anasayfa": { title: "Anasayfa", component: Anasayfa },
    "/lokasyonlar": { title: "Lokasyonlar", component: Lokasyonlar },
    "/projeler": { title: "Projeler", component: Projeler },
    "/toplu-evraklar": { title: "Tüm Evraklar", component: TopluEvraklar },
    "/evrak-ekle": { title: "Evrak Ekle", component: EvrakEkle },
    "/kargo-bilgisi-ekle": { title: "Kargo Bilgisi Ekle", component: KargoBilgisiEkle },
    "/tum-kargo-bilgileri": { title: "Tüm Kargo Bilgileri", component: TumKargoBilgileri },
    "/tutanak": { title: "Tutanak", component: Tutanak },
    "/raporlar": { title: "Reel Raporları", component: Raporlar },
    "/toplu-tutanak": { title: "Toplu Tutanak", component: TopluTutanak },
    "/hedef-kargo": { title: "Hedef Kargo", component: HedefKargo },
    "/evrak-raporlari": { title: "Evrak Raporları", component: EvrakRaporlari },
    "/ExcelDonusum": { title: "Excel & Word", component: ExcelDonusum },
    "/tahakkuk": { title: "Tahakkuk", component: Tahakkuk },
    "/tahakkuk-takip": { title: "Tahakkuk Takip", component: TahakkukTakip },
    "/jpg-to-pdf": { title: "JPG TO PDF", component: JpgToPdf },
    "/pdf-sikistirma": { title: "PDF Sıkıştırma", component: PdfSikistirma },
    "/musteri-evraki": { title: "Müşteri Evrakları", component: MusteriEvraklari },
    "/ticket-yonetimi": { title: "Ticket Yönetimi", component: TicketAdmin },
    "/yonetim-paneli": { title: "Yönetim Paneli", component: AdminPanel },
    "/gorev-merkezi": { title: "İş / Görev Merkezi", component: TaskCenter },
    "/operasyon-takvimi": { title: "Operasyon Takvimi", component: OperationCalendar },
    "/audit-log": { title: "Aktivite / Audit Log", component: AuditLog },
    "/rapor-merkezi": { title: "Otomatik Rapor Merkezi", component: ReportCenter },

};