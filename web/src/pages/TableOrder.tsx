import { ComingSoon } from "../components/ComingSoon";

export default function TableOrder() {
  return (
    <ComingSoon
      title="Masa Siparişi"
      description="Kafe/bufe masalarindan alinan siparisleri olusturup ziyaret hesabina ekleyebileceginiz bolum. Yakinda aktif olacak."
      bullets={[
        "Masa bazli siparis olusturma",
        "Urun listesi ve adet secimi",
        "Siparisi ziyaret/kasa hesabina yansitma",
      ]}
    />
  );
}
