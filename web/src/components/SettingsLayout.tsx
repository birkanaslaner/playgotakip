import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Icon, type IconName } from "./icons";

interface SettingsItem {
  to: string;
  label: string;
  desc: string;
  icon: IconName;
  badge?: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const settingsSections: SettingsSection[] = [
  {
    title: "İşletme",
    items: [
      { to: "/ayarlar/abonelik", label: "Abonelik", desc: "Plan, fatura ve ödeme", icon: "creditCard" },
      { to: "/ayarlar/urunler", label: "Ürünler", desc: "Kafe ürünleri ve stok", icon: "box" },
      { to: "/ayarlar/dil-bolge", label: "Dil ve Bölge", desc: "Para birimi, saat dilimi", icon: "globe" },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { to: "/ayarlar/tercihler", label: "Uygulama Tercihleri", desc: "Üyelikler ve davranışlar", icon: "sliders" },
      { to: "/ayarlar/sure-takip", label: "Süre Takip Ayarları", desc: "Süre paketleri ve ücretler", icon: "clock" },
    ],
  },
  {
    title: "İletişim",
    items: [
      { to: "/ayarlar/bildirimler", label: "Bildirimler", desc: "E-posta ve push tercihleri", icon: "bell" },
      { to: "/ayarlar/sms-otomasyonu", label: "SMS Otomasyonu", desc: "Şablonlar ve izinler", icon: "chat", badge: "PRO" },
    ],
  },
  {
    title: "Hesap ve Güvenlik",
    items: [
      { to: "/ayarlar/kullanicilar", label: "Kullanıcılar", desc: "Personel ve roller", icon: "users" },
      { to: "/ayarlar/guvenlik", label: "Güvenlik", desc: "Şifre ve oturumlar", icon: "lock" },
      { to: "/ayarlar/yasal", label: "Yasal Metinler", desc: "KVKK ve sözleşmeler", icon: "doc" },
    ],
  },
];

export function SettingsLayout() {
  const [search, setSearch] = useState("");

  const sections = settingsSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        (item.label + " " + item.desc).toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"))
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-slate-200 bg-white">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-4">
          <h1 className="text-lg font-bold text-slate-800">Ayarlar</h1>
          <p className="text-sm text-slate-400">İşletmeni buradan yönet</p>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white"
              placeholder="Ayarlarda ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {sections.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                        isActive ? "bg-indigo-500 text-white" : "hover:bg-slate-100"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon name={item.icon} className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span
                              className={`truncate text-sm font-semibold ${
                                isActive ? "text-white" : "text-slate-700"
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                                {item.badge}
                              </span>
                            )}
                          </span>
                          <span
                            className={`block truncate text-xs ${
                              isActive ? "text-indigo-100" : "text-slate-400"
                            }`}
                          >
                            {item.desc}
                          </span>
                        </span>
                        {isActive && <Icon name="chevronRight" className="h-4 w-4 text-white" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
