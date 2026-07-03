import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "./icons";

const routeTitles: Record<string, string> = {
  "/": "Anasayfa",
  "/sure-takip": "Süre Takip",
  "/masalar": "Masalar",
  "/sms/gonder": "SMS Gönder",
  "/sms/gecmis": "Gönderim Geçmişi",
  "/push/gonder": "Push Bildirim",
  "/raporlar": "Analizler",
  "/raporlar/doluluk": "Doluluk",
  "/musteriler": "Müşteriler",
  "/abonelikler": "Abonelikler",
  "/pazar-yeri": "Pazar Yeri",
  "/iys": "İYS Bilgilendirme",
  "/cekilis": "Çekiliş",
  "/sss": "S.S.S",
};

const settingsTitles: Record<string, string> = {
  "/ayarlar/sure-takip": "Süre Takip",
  "/ayarlar/abonelik": "Abonelik",
  "/ayarlar/urunler": "Ürünler",
  "/ayarlar/dil-bolge": "Dil ve Bölge",
  "/ayarlar/tercihler": "Uygulama Tercihleri",
  "/ayarlar/bildirimler": "Bildirimler",
  "/ayarlar/sms-otomasyonu": "SMS Otomasyonu",
  "/ayarlar/kullanicilar": "Kullanıcılar",
  "/ayarlar/guvenlik": "Güvenlik",
  "/ayarlar/yasal": "Yasal Metinler",
};

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSettings = location.pathname.startsWith("/ayarlar");
  const crumbs = isSettings
    ? ["Ayarlar", settingsTitles[location.pathname] ?? ""]
    : [routeTitles[location.pathname] ?? "Anasayfa"];
  const initial = (user?.fullName ?? "K").charAt(0).toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700";

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <button className={iconBtn} onClick={onToggleSidebar} aria-label="Menü">
        <Icon name="menu" />
      </button>

      <nav className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">PlayGo</span>
        {crumbs.filter(Boolean).map((c, i, arr) => (
          <span key={c} className="flex items-center gap-2">
            <span className="text-slate-300">/</span>
            <span
              className={
                i === arr.length - 1 ? "font-medium text-slate-700" : "text-slate-400"
              }
            >
              {c}
            </span>
          </span>
        ))}
      </nav>

      <div className="mx-auto hidden w-full max-w-md md:block">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-16 text-sm outline-none focus:border-brand-400 focus:bg-white"
            placeholder="Arama yapın (CMD+K)..."
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button className={iconBtn} aria-label="Yardım">
          <Icon name="help" />
        </button>
        <button className={iconBtn} aria-label="Tema">
          <Icon name="moon" />
        </button>
        <button className={`${iconBtn} relative`} aria-label="Bildirimler">
          <Icon name="bell" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <button className={iconBtn} aria-label="Geri bildirim">
          <Icon name="feedback" />
        </button>

        <div className="relative ml-1" ref={menuRef}>
          <button
            className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-slate-100"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {user?.username}
            </span>
            <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <div className="text-sm font-medium text-slate-700">{user?.fullName}</div>
                <div className="text-xs text-slate-400">
                  {user?.role === "ADMIN" ? "Yönetici" : "Personel"}
                </div>
              </div>
              <button
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/ayarlar");
                }}
              >
                Ayarlar
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-50"
                onClick={() => {
                  logout();
                  navigate("/giris");
                }}
              >
                Çıkış
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
