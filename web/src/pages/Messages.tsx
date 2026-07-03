import { ComingSoon } from "../components/ComingSoon";

export default function Messages() {
  return (
    <ComingSoon
      title="Mesajlaşma"
      description="Velilere SMS veya bildirim gonderebileceginiz mesajlasma bolumu. Yakinda aktif olacak."
      bullets={[
        "Tekli ve toplu SMS gonderimi",
        "Kampanya ve bilgilendirme mesajlari",
        "Gonderim gecmisi ve sablonlar",
      ]}
    />
  );
}
