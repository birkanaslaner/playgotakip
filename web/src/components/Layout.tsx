import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icon, type IconName } from "./icons";
import { Topbar } from "./Topbar";

interface MenuItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  children?: { to: string; label: string }[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const sections: MenuSection[] = [
  {
    title: "Menü",
    items: [
      { to: "/", label: "Anasayfa", icon: "grid", end: true },
      { to: "/sure-takip", label: "Süre Takip", icon: "clock" },
      { to: "/masalar", label: "Masalar", icon: "cart" },
    ],
  },
  {
    title: "Mesajlaşma",
    items: [
      {
        to: "/sms",
        label: "SMS",
        icon: "mail",
        children: [
          { to: "/sms/gonder", label: "SMS Gönder" },
          { to: "/sms/gecmis", label: "Gönderim Geçmişi" },
        ],
      },
      {
        to: "/push",
        label: "Push",
        icon: "push",
        children: [{ to: "/push/gonder", label: "Push Bildirim" }],
      },
    ],
  },
  {
    title: "Raporlar",
    items: [
      {
        to: "/raporlar",
        label: "Analizler",
        icon: "chart",
        children: [
          { to: "/raporlar", label: "Genel Bakış" },
          { to: "/raporlar/doluluk", label: "Doluluk" },
        ],
      },
      { to: "/musteriler", label: "Müşteriler", icon: "users" },
      { to: "/abonelikler", label: "Abonelikler", icon: "list" },
    ],
  },
  {
    title: "Diğer",
    items: [
      { to: "/pazar-yeri", label: "Pazar Yeri", icon: "store" },
      { to: "/iys", label: "İYS Bilgilendirme", icon: "info" },
      { to: "/cekilis", label: "Çekiliş", icon: "gift" },
      { to: "/sss", label: "S.S.S", icon: "question" },
    ],
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const mini = collapsed && !hovered;

  function isGroupOpen(item: MenuItem) {
    if (openGroups[item.to] !== undefined) return openGroups[item.to];
    return location.pathname.startsWith(item.to);
  }

  const linkClass =
    (mini: boolean) =>
    ({ isActive }: { isActive: boolean }) =>
      `flex items-center rounded-lg text-sm font-medium transition ${
        mini ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
      } ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`;

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg py-2 pl-11 pr-3 text-sm transition ${
      isActive
        ? "font-medium text-emerald-700"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const renderSidebar = (mini: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-100 ${
          mini ? "justify-center px-2" : "gap-2 px-4"
        }`}
      >
        <span className="flex items-center rounded-lg bg-slate-900 p-1.5">
          <img
            src="/logo.png"
            alt="PlayGo"
            className={`object-contain ${mini ? "h-6 w-6" : "h-7 w-7"}`}
          />
        </span>
        {!mini && <span className="text-lg font-bold text-slate-800">PlayGo</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            {!mini && (
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) =>
                item.children ? (
                  mini ? (
                    <NavLink
                      key={item.to}
                      to={item.children[0].to}
                      title={item.label}
                      className={linkClass(true)}
                    >
                      <Icon name={item.icon} />
                    </NavLink>
                  ) : (
                    <div key={item.to}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenGroups((prev) => ({ ...prev, [item.to]: !isGroupOpen(item) }))
                        }
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Icon name={item.icon} />
                        <span className="flex-1 text-left">{item.label}</span>
                        <Icon
                          name="chevronDown"
                          className={`h-4 w-4 transition-transform ${
                            isGroupOpen(item) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isGroupOpen(item) && (
                        <div className="mt-0.5 space-y-0.5">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              end
                              className={subLinkClass}
                              onClick={() => setMobileOpen(false)}
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={mini ? item.label : undefined}
                    className={linkClass(mini)}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon name={item.icon} />
                    {!mini && item.label}
                  </NavLink>
                )
              )}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <aside
        onMouseEnter={collapsed ? () => setHovered(true) : undefined}
        onMouseLeave={collapsed ? () => setHovered(false) : undefined}
        className={`hidden shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-300 ease-in-out md:block ${
          mini ? "w-20" : "w-64"
        }`}
      >
        {renderSidebar(mini)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-slate-200 bg-white">
            {renderSidebar(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onToggleSidebar={() => {
            setMobileOpen((o) => !o);
            setCollapsed((d) => !d);
            setHovered(false);
          }}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <button
        className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600"
        aria-label="Destek"
      >
        <Icon name="chat" />
      </button>
    </div>
  );
}
