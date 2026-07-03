import { ComingSoon } from "../components/ComingSoon";

export default function Iys() {
  return (
    <ComingSoon
      title="İYS Bilgilendirme"
      description="Ileti Yonetim Sistemi (IYS) izin yonetimi ve bilgilendirme bolumu. Ticari elektronik ileti gonderimi icin veli izinlerini buradan yonetebilirsiniz. Yakinda aktif olacak."
      bullets={[
        "Veli onay (izin) durumlarinin takibi",
        "IYS'ye izin ekleme / cikarma",
        "Onay gecmisi ve raporlama",
      ]}
    />
  );
}
