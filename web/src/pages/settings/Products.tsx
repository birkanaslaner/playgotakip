import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Category, Product } from "../../api/types";
import { Icon } from "../../components/icons";
import { formatCurrency } from "../../utils/format";
import { ProductDrawer } from "./ProductDrawer";

function CategoryRow({
  category,
  onChanged,
  index,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  category: Category;
  onChanged: () => void;
  index: number;
  onDragStart: (i: number) => void;
  onDragEnter: (i: number) => void;
  onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");

  const save = useMutation({
    mutationFn: async () =>
      api.put(`/categories/${category.id}`, {
        name: name.trim(),
        description: description.trim() || null,
      }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: async () => api.delete(`/categories/${category.id}`),
    onSuccess: onChanged,
  });

  if (editing) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
        <div>
          <label className="label">Kategori adı</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label">
            Açıklama <span className="font-normal text-slate-400">İsteğe bağlı</span>
          </label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bu kategoriyi kısaca tanımlayın"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setName(category.name);
              setDescription(category.description ?? "");
              setEditing(false);
            }}
          >
            İptal
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => name.trim() && save.mutate()}
            disabled={save.isPending || !name.trim()}
          >
            Kaydet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5"
    >
      <button
        type="button"
        className="shrink-0 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        aria-label="Sıralamak için sürükleyin"
      >
        <Icon name="drag" className="h-4 w-4" />
      </button>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon name="box" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{category.name}</p>
        {category.description && (
          <p className="truncate text-xs text-slate-400">{category.description}</p>
        )}
      </div>
      <button
        type="button"
        className="text-slate-400 hover:text-indigo-600"
        onClick={() => setEditing(true)}
        aria-label="Kategoriyi düzenle"
      >
        <Icon name="pencil" className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="text-slate-400 hover:text-red-600"
        onClick={() => remove.mutate()}
        aria-label="Kategoriyi sil"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </div>
  );
}

function CategoriesDrawer({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  const [items, setItems] = useState<Category[]>([]);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    if (categories.data) setItems(categories.data);
  }, [categories.data]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  function resetForm() {
    setAdding(false);
    setName("");
    setDescription("");
  }

  const add = useMutation({
    mutationFn: async () =>
      api.post("/categories", { name: name.trim(), description: description.trim() || null }),
    onSuccess: () => {
      refresh();
      resetForm();
    },
  });

  const reorder = useMutation({
    mutationFn: async (ids: number[]) => api.put("/categories/reorder", { ids }),
    onSuccess: refresh,
  });

  function handleDragStart(i: number) {
    dragIndex.current = i;
  }

  function handleDragEnter(i: number) {
    const from = dragIndex.current;
    if (from === null || from === i) return;
    setItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(i, 0, moved);
      return copy;
    });
    dragIndex.current = i;
  }

  function handleDragEnd() {
    dragIndex.current = null;
    reorder.mutate(items.map((c) => c.id));
  }

  const count = categories.data?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Icon name="tag" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Kategorileri Yönet</h3>
              <p className="text-xs text-slate-400">Ürün kategorilerinizi düzenleyin</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 px-6 pt-4">
          <p className="text-sm text-slate-500">
            Kategorileri yeniden adlandırın, açıklamalarını güncelleyin, ekleyin veya kaldırın.
          </p>
          <span className="shrink-0 text-xs text-slate-400">{count} kategori</span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {categories.isLoading ? (
            <p className="text-sm text-slate-500">Yükleniyor...</p>
          ) : count > 0 ? (
            items.map((c, i) => (
              <CategoryRow
                key={c.id}
                category={c}
                index={i}
                onChanged={refresh}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragEnd={handleDragEnd}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              Henüz kategori yok. Aşağıdan ilk kategorinizi ekleyin.
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-100 px-6 py-4">
          {adding ? (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <div>
                <label className="label">Kategori adı</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: İçecekler"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">
                  Açıklama <span className="font-normal text-slate-400">İsteğe bağlı</span>
                </label>
                <input
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bu kategoriyi kısaca tanımlayın"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={resetForm}>
                  İptal
                </button>
                <button
                  type="button"
                  className="btn-primary gap-2"
                  onClick={() => name.trim() && add.mutate()}
                  disabled={add.isPending || !name.trim()}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Ekle
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-ghost w-full gap-2 border-dashed"
              onClick={() => setAdding(true)}
            >
              <Icon name="plus" className="h-4 w-4" />
              Yeni kategori ekle
            </button>
          )}
          <div className="flex justify-end">
            <button className="btn-primary" onClick={onClose}>
              Bitti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  onChanged,
  onEdit,
}: {
  product: Product;
  onChanged: () => void;
  onEdit: (p: Product) => void;
}) {
  const remove = useMutation({
    mutationFn: async () => api.delete(`/products/${product.id}`),
    onSuccess: onChanged,
  });

  return (
    <tr className="text-slate-700">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-300">
            {product.image ? (
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <Icon name="box" className="h-5 w-5" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">{product.name}</span>
            {!product.active && <span className="badge bg-slate-100 text-slate-500">Pasif</span>}
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        {product.category ? (
          <span className="badge bg-indigo-50 text-indigo-600">{product.category.name}</span>
        ) : (
          <span className="text-slate-400">Kategorisiz</span>
        )}
      </td>
      <td className="px-5 py-3 font-semibold text-slate-800">{formatCurrency(product.price)}</td>
      <td className="px-5 py-3 font-medium text-emerald-600">{product.stock} adet</td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="text-slate-400 hover:text-indigo-600"
            onClick={() => onEdit(product)}
            aria-label="Ürünü düzenle"
          >
            <Icon name="pencil" className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="text-slate-400 hover:text-red-600"
            onClick={() => remove.mutate()}
            aria-label="Ürünü sil"
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ProductsSettings() {
  const queryClient = useQueryClient();
  const [showCategories, setShowCategories] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState("Tümü");

  const products = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get<Product[]>("/products")).data,
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  function refreshProducts() {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const all = products.data ?? [];
  const list = activeTab === "Tümü" ? all : all.filter((p) => p.category?.name === activeTab);
  const tabs = ["Tümü", ...(categories.data?.map((c) => c.name) ?? [])];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
            <Icon name="box" className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Ürün ve Kategori Yönetimi</h2>
            <p className="text-sm text-slate-500">
              Kafe menünüzdeki ürünleri, kategorileri ve stok durumlarını yönetin.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost gap-2" onClick={() => setShowCategories(true)}>
            <Icon name="list" className="h-4 w-4" />
            Kategoriler
          </button>
          <button
            className="btn gap-2 bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => setShowProduct(true)}
          >
            <Icon name="plus" className="h-4 w-4" />
            Ürün Ekle
          </button>
        </div>
      </div>

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Icon name="box" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-800">Kafe Ürünleri</h3>
              <p className="text-xs text-slate-400">{all.length} ürün</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            {categories.data?.length ?? 0} kategori
          </span>
        </div>

        {products.isLoading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-400">Yükleniyor...</div>
        ) : list.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Ürün</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Fiyat</th>
                  <th className="px-5 py-3">Stok</th>
                  <th className="px-5 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    onChanged={refreshProducts}
                    onEdit={setEditProduct}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
              <Icon name="box" className="h-8 w-8" />
            </span>
            <p className="text-sm text-slate-400">
              {all.length === 0 ? "Seçilmedi" : `"${activeTab}" için ürün yok`}
            </p>
          </div>
        )}
      </div>

      {showCategories && <CategoriesDrawer onClose={() => setShowCategories(false)} />}
      {showProduct && (
        <ProductDrawer onClose={() => setShowProduct(false)} onSaved={refreshProducts} />
      )}
      {editProduct && (
        <ProductDrawer
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={refreshProducts}
        />
      )}
    </div>
  );
}
