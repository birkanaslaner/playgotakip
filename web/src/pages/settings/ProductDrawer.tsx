import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, apiError } from "../../api/client";
import type { Category, Product } from "../../api/types";
import { Icon } from "../../components/icons";
import { formatCurrency } from "../../utils/format";

const vatRates = [0, 1, 8, 10, 18, 20];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-brand-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function ProductDrawer({
  onClose,
  onSaved,
  product,
}: {
  onClose: () => void;
  onSaved: () => void;
  product?: Product;
}) {
  const editing = !!product;
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(product?.image ?? null);
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    product?.categoryId ? String(product.categoryId) : ""
  );
  const [price, setPrice] = useState(product ? String(product.price) : "0");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [vatRate, setVatRate] = useState(product?.vatRate ?? 10);
  const [active, setActive] = useState(product?.active ?? true);
  const [showInQrMenu, setShowInQrMenu] = useState(product?.showInQrMenu ?? true);
  const [qrDescription, setQrDescription] = useState(product?.qrDescription ?? "");
  const [tags, setTags] = useState(product?.tags ?? "");
  const [error, setError] = useState("");

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  const priceNum = Number(price) || 0;
  const net = priceNum / (1 + vatRate / 100);
  const vatAmount = priceNum - net;

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        categoryId: categoryId ? Number(categoryId) : null,
        price: priceNum,
        stock: Number(stock) || 0,
        vatRate,
        image,
        active,
        showInQrMenu,
        qrDescription: qrDescription || null,
        tags: tags || null,
      };
      return editing
        ? (await api.put<Product>(`/products/${product!.id}`, payload)).data
        : (await api.post<Product>("/products", payload)).data;
    },
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => setError(apiError(err, "Ürün kaydedilemedi")),
  });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Görsel 3MB'den küçük olmalı");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Lütfen ürün adı girin");
      return;
    }
    create.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Icon name="box" className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold text-slate-800">
              {editing ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="label">Ürün Görseli</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-center hover:border-brand-500"
            >
              {image ? (
                <img src={image} alt="Önizleme" className="h-24 w-24 rounded-lg object-cover" />
              ) : (
                <>
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Icon name="image" className="h-5 w-5" />
                  </span>
                  <span className="text-sm text-slate-500">Görsel yüklemek için tıklayın</span>
                  <span className="text-xs text-slate-400">veya sürükleyin</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label className="label">Ürün Adı</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Portakal Suyu"
            />
          </div>

          <div>
            <label className="label">Kategori</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Kategori seçin</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Satış Fiyatı</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                className="input pr-8"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₺</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stok</label>
              <input
                type="number"
                className="input"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
            <div>
              <label className="label">KDV Oranı (%)</label>
              <select
                className="input"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
              >
                {vatRates.map((r) => (
                  <option key={r} value={r}>
                    %{r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Muhasebe Özeti
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Net Fiyat (KDV Hariç)</span>
                <span>{formatCurrency(net)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>KDV Tutarı (%{vatRate})</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-brand-700">
                <span>Genel Toplam (KDV Dahil)</span>
                <span>{formatCurrency(priceNum)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Aktif Ürün</span>
            <Toggle checked={active} onChange={setActive} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">QR Menüde Göster</span>
            <Toggle checked={showInQrMenu} onChange={setShowInQrMenu} />
          </div>

          <div>
            <label className="label">Açıklama (QR Menü)</label>
            <textarea
              className="input min-h-[72px] resize-y"
              value={qrDescription}
              onChange={(e) => setQrDescription(e.target.value)}
              placeholder="Misafirlerin QR menüde görecekleri kısa açıklama"
            />
          </div>

          <div>
            <label className="label">Etiketler (QR Menü)</label>
            <input
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Virgülle ayırın — örn. vegan, glütensiz"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            İptal
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? "Kaydediliyor..." : editing ? "Kaydet" : "Ürün Ekle"}
          </button>
        </div>
      </form>
    </div>
  );
}
