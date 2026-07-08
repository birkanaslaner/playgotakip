import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Icon, type IconName } from "../../components/icons";
import { Toggle } from "../../components/Toggle";

interface PrefRow {
  key: string;
  label: string;
  desc: string;
  default?: boolean;
}

interface PrefSection {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  master?: {
    key: string;
    offLabel: string;
    onLabel: string;
    default?: boolean;
    warningWhenOff?: string;
  };
  rows: PrefRow[];
}

const sections: PrefSection[] = [
  {
    id: "receipt",
    title: "Bilgi Fişi",
    desc: "Kayıt sırasında müşteriye verilen bilgi fişinin içeriğini buradan yönetin.",
    icon: "doc",
    master: {
      key: "receipt.enabled",
      offLabel: "Kapalı",
      onLabel: "Açık",
      default: false,
      warningWhenOff:
        "Bilgi fişi yazdırma kapalı. Yeni kayıtlarda fiş yazdırılmayacak. Aşağıdaki ayarlar yazdırma açıldığında geçerli olur.",
    },
    rows: [],
  },
  {
    id: "sales",
    title: "Satış ve İndirim",
    desc: "Fiyatlandırma, kampanya ve indirim kuralları",
    icon: "tag",
    rows: [
      {
        key: "sales.discountAmount",
        label: "İndirimli Satış Tutarı",
        desc: "Satış sırasında indirim seçeneklerini etkinleştirir",
        default: true,
      },
      {
        key: "sales.discountRate",
        label: "İndirimli Satış Oranı",
        desc: "İndirimli Satış Tutarı özelliği de aktif olduğunda yüzde bazlı indirimleri etkinleştirir",
      },
      {
        key: "sales.multiChildDiscount",
        label: "Çoklu Çocuk İndirimi",
        desc: "Seçilen çocuk sayısına göre otomatik indirim uygulanmasını sağlar",
      },
      {
        key: "sales.freeEntryCampaign",
        label: "Bedava Giriş Kampanyası",
        desc: 'Yalnızca "Promosyon Paketi" olarak işaretlenen Süre Paketlerinde geçerlidir. Belirli sayıda ücretli girişten sonra 1 ücretsiz giriş hakkı tanır (örn. 10 girişe 1 bedava). Bedava giriş verir — yüzde indirim için "Kademeli Sadakat İndirimi"ni kullanın.',
      },
      {
        key: "sales.loyaltyDiscount",
        label: "Kademeli Sadakat İndirimi",
        desc: 'Tüm süre paketlerinde geçerlidir, paket başına işaretleme gerekmez. Belirli gün içinde belirli sayıda giriş yapan müşteriye otomatik yüzde indirim uygular (örn. son 365 günde 20 giriş → %15). İndirimli giriş sağlar — ücretsiz giriş için "Bedava Giriş Kampanyası"nı kullanın.',
      },
    ],
  },
  {
    id: "customer",
    title: "Müşteri Kaydı",
    desc: "Kayıt formunda görünecek alanlar",
    icon: "users",
    rows: [
      {
        key: "customer.notes",
        label: "Not Ekle",
        desc: "Müşteri profiline özel notlar eklenmesine izin verir.",
      },
      {
        key: "customer.birthday",
        label: "Doğum Günü Alanı",
        desc: "Kayıt sırasında müşteri doğum günü alanı ekler.",
      },
      {
        key: "customer.membershipValidity",
        label: "Abonelik Geçerlilik Süresi",
        desc: "Abonelik paketleri için geçerlilik süresi (ay) seçeneğini etkinleştirir.",
        default: true,
      },
      {
        key: "customer.locker",
        label: "Dolap Numarası",
        desc: "Dolap atama ve takibini etkinleştirir.",
      },
      {
        key: "customer.queueNumber",
        label: "Sıra Numarası",
        desc: "Sıra yönetimi ve numara atamayı etkinleştirir.",
      },
      {
        key: "customer.posIntegration",
        label: "Oyun Alanı - Kafe POS Entegrasyonu",
        desc: "Oyun alanı oturumlarını kafe masaları ile bağlamayı ve açılışın kafe ayarlarına aktarmayı sağlar.",
      },
    ],
  },
  {
    id: "operation",
    title: "Operasyon",
    desc: "Çalışma akışı ve kasada görünüm",
    icon: "grid",
    rows: [
      {
        key: "operation.counterDirection",
        label: "Sayaç Yönü",
        desc: "Oturumlar için ileri veya geri sayım arasında seçim yapın.",
        default: true,
      },
      {
        key: "operation.hideDelivered",
        label: "Teslim Edilenleri Gizle",
        desc: "Boya ile teslim edilen misafirleri gizler.",
        default: true,
      },
      {
        key: "operation.deliverAllButton",
        label: "Tümünü Teslim Et Butonu",
        desc: "Tüm aktif seansları tek seferde teslim etme butonunu dashboard üzerinde gösterir.",
      },
      {
        key: "operation.bulkDeliver",
        label: "Seçili Seansları Toplu Teslim Et",
        desc: "Süre Takip ekranında her seans satırına seçim kutusu ekler; aynı veliye bağlı olanları seçip tek hamlede birlikte kapatabilirsiniz.",
      },
      {
        key: "operation.autoShareTime",
        label: "Süreyi Otomatik Paylaştır",
        desc: "Birden fazla çocuk seçildiğinde abonelikten kalan toplam süreyi çocuklar arasında eşit olarak paylaştırır.",
      },
    ],
  },
  {
    id: "automation",
    title: "Otomasyon ve İletişim",
    desc: "SMS, duyuru ve güvenlik akışları",
    icon: "chat",
    rows: [
      {
        key: "automation.smsAutomation",
        label: "SMS Otomasyonu",
        desc: "Giriş ve çıkışlarda otomatik SMS bildirimlerini etkinleştirir.",
      },
      {
        key: "automation.birthdaySms",
        label: "Otomatik Doğum Günü SMS",
        desc: "Çocukların doğum gününden önce otomatik kutlama ve hatırlatma SMS gönderir.",
      },
      {
        key: "automation.announcement",
        label: "Anons Otomasyonu",
        desc: "Ziyaretçiler için otomatik anons sistemini etkinleştirir.",
      },
      {
        key: "automation.secureDelivery",
        label: "Güvenli Teslimat",
        desc: "Misafir tesliminden önce doğrulama gerektirir.",
      },
    ],
  },
  {
    id: "other",
    title: "Diğer",
    desc: "Henüz gruplanmamış özellikler",
    icon: "list",
    rows: [
      {
        key: "other.qrMenuFromKidsplay",
        label: "QR Menüyü KidsPlay'den Yükle",
        desc: "QR menü ürünlerini Google Sheet yerine KidsPlay'deki kafe ürünlerinden çeker.",
      },
    ],
  },
];

type Settings = Record<string, string>;

function allKeys(): { key: string; default: boolean }[] {
  const keys: { key: string; default: boolean }[] = [];
  for (const s of sections) {
    if (s.master) keys.push({ key: s.master.key, default: s.master.default ?? false });
    for (const r of s.rows) keys.push({ key: r.key, default: r.default ?? false });
  }
  return keys;
}

export default function Preferences() {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get<Settings>("/settings")).data,
  });

  const data = settings.data ?? {};

  function isOn(key: string, def = false): boolean {
    const v = data[key];
    if (v === "true") return true;
    if (v === "false") return false;
    return def;
  }

  const save = useMutation({
    mutationFn: async (patch: Settings) => (await api.put<Settings>("/settings", patch)).data,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["settings"] });
      const prev = queryClient.getQueryData<Settings>(["settings"]);
      queryClient.setQueryData<Settings>(["settings"], { ...(prev ?? {}), ...patch });
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["settings"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  function toggle(key: string, value: boolean) {
    save.mutate({ [key]: String(value) });
  }

  const keys = allKeys();
  const total = keys.length;
  const activeCount = keys.filter((k) => isOn(k.key, k.default)).length;
  const pct = total ? Math.round((activeCount / total) * 100) : 0;
  const circumference = 2 * Math.PI * 18;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
            <Icon name="sliders" className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Uygulama Tercihleri</h2>
            <p className="max-w-xl text-sm text-slate-500">
              Kayıt akışını, satış kurallarını ve operasyon davranışlarını işletmenize göre
              özelleştirin.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
          <div className="relative h-11 w-11">
            <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="#6366f1"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct / 100)}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
              {activeCount}
            </span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-700">
              {activeCount} / {total} özellik aktif
            </p>
            <p className="text-xs text-slate-400">Tercihler bu işletmeye özeldir</p>
          </div>
        </div>
      </div>

      {settings.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-400">
          Yükleniyor...
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const masterOn = section.master ? isOn(section.master.key, section.master.default) : true;
            const sectionActive = section.rows.filter((r) => isOn(r.key, r.default)).length;
            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon name={section.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-800">{section.title}</h3>
                      <p className="text-sm text-slate-400">{section.desc}</p>
                    </div>
                  </div>
                  {section.master ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">
                        {masterOn ? section.master.onLabel : section.master.offLabel}
                      </span>
                      <Toggle
                        checked={masterOn}
                        onChange={(v) => toggle(section.master!.key, v)}
                      />
                    </div>
                  ) : section.rows.length > 0 ? (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                      {sectionActive}/{section.rows.length}
                    </span>
                  ) : null}
                </div>

                {section.master?.warningWhenOff && !masterOn && (
                  <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-700">
                    {section.master.warningWhenOff}
                  </div>
                )}

                {section.rows.length > 0 && (
                  <div className="divide-y divide-slate-100">
                    {section.rows.map((row) => (
                      <div
                        key={row.key}
                        className="flex items-start justify-between gap-4 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700">{row.label}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                            {row.desc}
                          </p>
                        </div>
                        <Toggle
                          checked={isOn(row.key, row.default)}
                          onChange={(v) => toggle(row.key, v)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
