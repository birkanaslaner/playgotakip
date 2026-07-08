import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { SettingsLayout } from "./components/SettingsLayout";
import { ComingSoon } from "./components/ComingSoon";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";
import Guardians from "./pages/Guardians";
import PricingPlans from "./pages/PricingPlans";
import Reports from "./pages/Reports";
import Messages from "./pages/Messages";
import Iys from "./pages/Iys";
import TableOrder from "./pages/TableOrder";
import TimeTrackingSettings from "./pages/settings/TimeTracking";
import ProductsSettings from "./pages/settings/Products";
import Preferences from "./pages/settings/Preferences";
import Subscription from "./pages/settings/Subscription";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Yukleniyor...
      </div>
    );
  }
  if (!user) return <Navigate to="/giris" replace />;
  return <Layout>{children}</Layout>;
}

const P = ({ children }: { children: ReactNode }) => <Protected>{children}</Protected>;

export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<Login />} />

      {/* MENU */}
      <Route path="/" element={<P><Dashboard /></P>} />
      <Route path="/sure-takip" element={<P><CheckOut /></P>} />
      <Route path="/giris-yap" element={<P><CheckIn /></P>} />
      <Route path="/masalar" element={<P><TableOrder /></P>} />

      {/* MESAJLASMA */}
      <Route path="/sms/gonder" element={<P><Messages /></P>} />
      <Route
        path="/sms/gecmis"
        element={
          <P>
            <ComingSoon
              title="Gönderim Geçmişi"
              description="Gonderilen SMS'lerin gecmisi ve durumlari burada listelenecek. Yakinda aktif olacak."
            />
          </P>
        }
      />
      <Route
        path="/push/gonder"
        element={
          <P>
            <ComingSoon
              title="Push Bildirim"
              description="Uygulama uzerinden anlik push bildirim gonderebileceginiz bolum. Yakinda aktif olacak."
            />
          </P>
        }
      />

      {/* RAPORLAR */}
      <Route path="/raporlar" element={<P><Reports /></P>} />
      <Route
        path="/raporlar/doluluk"
        element={
          <P>
            <ComingSoon
              title="Doluluk Raporu"
              description="Gun/saat bazli doluluk ve yogunluk analizleri. Yakinda aktif olacak."
            />
          </P>
        }
      />
      <Route path="/musteriler" element={<P><Guardians /></P>} />
      <Route path="/abonelikler" element={<P><PricingPlans /></P>} />

      {/* AYARLAR */}
      <Route path="/ayarlar" element={<P><SettingsLayout /></P>}>
        <Route index element={<Navigate to="/ayarlar/sure-takip" replace />} />
        <Route path="sure-takip" element={<TimeTrackingSettings />} />
        <Route path="abonelik" element={<Subscription />} />
        <Route path="urunler" element={<ProductsSettings />} />
        <Route
          path="dil-bolge"
          element={<ComingSoon title="Dil ve Bölge" description="Para birimi ve saat dilimi ayarlari. Yakinda aktif olacak." />}
        />
        <Route path="tercihler" element={<Preferences />} />
        <Route
          path="bildirimler"
          element={<ComingSoon title="Bildirimler" description="E-posta ve push bildirim tercihleri. Yakinda aktif olacak." />}
        />
        <Route
          path="sms-otomasyonu"
          element={<ComingSoon title="SMS Otomasyonu" description="Otomatik SMS sablonlari ve izinler. Yakinda aktif olacak." />}
        />
        <Route
          path="kullanicilar"
          element={<ComingSoon title="Kullanıcılar" description="Personel ve rol yonetimi. Yakinda aktif olacak." />}
        />
        <Route
          path="guvenlik"
          element={<ComingSoon title="Güvenlik" description="Sifre ve oturum ayarlari. Yakinda aktif olacak." />}
        />
        <Route
          path="yasal"
          element={<ComingSoon title="Yasal Metinler" description="KVKK ve sozlesmeler. Yakinda aktif olacak." />}
        />
      </Route>

      {/* DIGER */}
      <Route
        path="/pazar-yeri"
        element={
          <P>
            <ComingSoon
              title="Pazar Yeri"
              description="Ek urun ve hizmetlerin satisa sunuldugu pazar yeri bolumu. Yakinda aktif olacak."
            />
          </P>
        }
      />
      <Route path="/iys" element={<P><Iys /></P>} />
      <Route
        path="/cekilis"
        element={
          <P>
            <ComingSoon
              title="Çekiliş"
              description="Musteriler arasinda cekilis duzenleyip kazananlari belirleyebileceginiz bolum. Yakinda aktif olacak."
            />
          </P>
        }
      />
      <Route
        path="/sss"
        element={
          <P>
            <ComingSoon
              title="S.S.S"
              description="Sikca sorulan sorular ve yardim icerikleri. Yakinda aktif olacak."
            />
          </P>
        }
      />

      {/* Eski yollar */}
      <Route path="/kasa" element={<Navigate to="/sure-takip" replace />} />
      <Route path="/kayitlar" element={<Navigate to="/musteriler" replace />} />
      <Route path="/kayitlar/yeni-kayit" element={<Navigate to="/musteriler" replace />} />
      <Route path="/kayitlar/masa-siparisi" element={<Navigate to="/masalar" replace />} />
      <Route path="/veliler" element={<Navigate to="/musteriler" replace />} />
      <Route path="/tarifeler" element={<Navigate to="/abonelikler" replace />} />
      <Route path="/paketler" element={<Navigate to="/abonelikler" replace />} />
      <Route path="/mesajlar" element={<Navigate to="/sms/gonder" replace />} />
      <Route path="/raporlar-eski" element={<Navigate to="/raporlar" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
