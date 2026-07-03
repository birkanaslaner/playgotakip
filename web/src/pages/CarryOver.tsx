import { ComingSoon } from "../components/ComingSoon";

export default function CarryOver() {
  return (
    <ComingSoon
      title="Devreden Süreler"
      description="Cocuklarin kullanmadigi ve sonraki ziyaretlere devreden sure bakiyelerini takip edebileceginiz bolum. Yakinda aktif olacak."
      bullets={[
        "Kalan/devreden sure bakiyesi",
        "Sonraki girise otomatik dusme",
        "Devir gecmisi ve raporlama",
      ]}
    />
  );
}
