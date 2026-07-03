import { ComingSoon } from "../components/ComingSoon";

export default function Coupons() {
  return (
    <ComingSoon
      title="Kupon Yönetimi"
      description="Indirim ve hediye kuponlari olusturup takip edebileceginiz bolum. Yakinda aktif olacak."
      bullets={[
        "Yuzde veya tutar bazli indirim kuponlari",
        "Gecerlilik tarihi ve kullanim limiti",
        "Kasada kupon kodu ile indirim uygulama",
      ]}
    />
  );
}
