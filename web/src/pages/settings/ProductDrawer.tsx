import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
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

function clearZeroOnFocus(value: string): string {
  return value === "0" || value === "0.00" ? "" : value;
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
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [price, setPrice] = useState(
    product && product.price > 0 ? String(product.price) : ""
  );
  const [stock, setStock] = useState(product !== undefined ? String(product.stock) : "");
  const [vatRate, setVatRate] = useState(product?.vatRate ?? 10);
  const [active, setActive] = useState(product?.active ?? true);
  const [showInQrMenu, setShowInQrMenu] = useState(product?.showInQrMenu ?? true);
  const [qrDescription, setQrDescription] = useState(product?.qrDescription ?? "");
  const [tags, setTags] = useState(product?.tags ?? "");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);
  const closingRef = useRef(false);

  const requestClose = useCallback(
    (done?: () => void) => {
      if (closingRef.current) {
        done?.();
        return;
      }
      closingRef.current = true;
      setOpen(false);
      window.setTimeout(() => {
        done?.();
        onClose();
      }, 320);
    },
    [onClose]
  );

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLocaleLowerCase("tr");
    return (categories.data ?? []).filter((c) =>
      !q || c.name.toLocaleLowerCase("tr").includes(q)
    );
  }, [categories.data, categorySearch]);

  const selectedCategory = categories.data?.find((c) => String(c.id) === categoryId);
  const priceNum = Number(price) || 0;
  const nameError = submitted && !name.trim();
  const categoryError = submitted && !categoryId;
  const priceError = submitted && (price.trim() === "" || priceNum <= 0);
  const stockError = submitted && stock.trim() === "";
  const net = priceNum / (1 + vatRate / 100);
  const vatAmount = priceNum - net;

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        categoryId: Number(categoryId),
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
      requestClose();
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

  function removeImage() {
    setImage(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (!name.trim()) return;
    if (!categoryId) return;
    if (price.trim() === "" || priceNum <= 0) return;
    if (stock.trim() === "") return;
    create.mutate();
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!categoryOpen) return;
    const close = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [categoryOpen]);

  useEffect(() => {
    const main = document.querySelector("main");
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPadding = document.body.style.paddingRight;
    const prevMainOverflow = main instanceof HTMLElement ? main.style.overflow : "";

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    if (main instanceof HTMLElement) {
      main.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.paddingRight = prevBodyPadding;
      if (main instanceof HTMLElement) {
        main.style.overflow = prevMainOverflow;
      }
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => requestClose()}
        aria-hidden
      />
      <form
        onSubmit={submit}
        className={`relative flex h-screen w-full max-w-lg flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
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
          <button type="button" onClick={() => requestClose()} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="label">Ürün Görseli</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <div className="relative">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[140px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-center hover:border-brand-500"
              >
                {image ? (
                  <div className="flex h-28 w-full items-center justify-center">
                    <img
                      src={image}
                      alt="Önizleme"
                      className="max-h-full max-w-full rounded-lg object-contain object-center"
                    />
                  </div>
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
              {image && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-500"
                  aria-label="Görseli kaldır"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="label">
              Ürün Adı <span className="text-red-500">*</span>
            </label>
            <input
              className={`input ${nameError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Portakal Suyu"
            />
            {nameError && <p className="mt-1 text-xs text-red-500">Lütfen ürün adı girin</p>}
          </div>

          <div>
            <label className="label">
              Kategori <span className="text-red-500">*</span>
            </label>
            <div ref={categoryRef} className="relative">
              <button
                type="button"
                onClick={() => setCategoryOpen((o) => !o)}
                className={`input flex w-full items-center justify-between gap-2 text-left ${
                  categoryError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""
                } ${selectedCategory ? "text-slate-800" : "text-slate-400"}`}
              >
                <span className="truncate">
                  {selectedCategory?.name ?? "Kategori seçin"}
                </span>
                <Icon
                  name="chevronDown"
                  className={`h-4 w-4 shrink-0 text-slate-400 transition ${categoryOpen ? "rotate-180" : ""}`}
                />
              </button>

              {categoryOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 p-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon name="search" className="h-4 w-4" />
                      </span>
                      <input
                        className="input py-2 pl-9 text-sm"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Kategori ara..."
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-40 space-y-0.5 overflow-y-auto p-1">
                    {categories.isLoading ? (
                      <p className="px-3 py-3 text-sm text-slate-400">Yükleniyor...</p>
                    ) : filteredCategories.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-slate-400">Kategori bulunamadı.</p>
                    ) : (
                      filteredCategories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCategoryId(String(c.id));
                            setCategoryOpen(false);
                            setCategorySearch("");
                          }}
                          className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition ${
                            categoryId === String(c.id)
                              ? "bg-brand-50 font-semibold text-brand-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {categoryError && (
              <p className="mt-1 text-xs text-red-500">Lütfen kategori seçin</p>
            )}
          </div>

          <div>
            <label className="label">
              Satış Fiyatı <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                className={`input pr-8 ${priceError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onFocus={() => setPrice((v) => clearZeroOnFocus(v))}
                placeholder="0,00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₺</span>
            </div>
            {priceError && (
              <p className="mt-1 text-xs text-red-500">Lütfen satış fiyatı girin</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                Stok <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                className={`input ${stockError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                onFocus={() => setStock((v) => clearZeroOnFocus(v))}
                placeholder="0"
              />
              {stockError && <p className="mt-1 text-xs text-red-500">Lütfen stok girin</p>}
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
          <button type="button" className="btn-ghost" onClick={() => requestClose()}>
            İptal
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? "Kaydediliyor..." : editing ? "Kaydet" : "Ürün Ekle"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
