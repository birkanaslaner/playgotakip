import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "../api/client";
import type { Guardian } from "../api/types";

function GuardianForm({ onCreated }: { onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: async () =>
      (await api.post<Guardian>("/guardians", { fullName, phone, note })).data,
    onSuccess: () => {
      setFullName("");
      setPhone("");
      setNote("");
      setError("");
      onCreated();
    },
    onError: (err) => setError(apiError(err, "Veli eklenemedi")),
  });

  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h2 className="font-semibold">Yeni Veli</h2>
      <div>
        <label className="label">Ad Soyad</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="label">Telefon</label>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="label">Not (opsiyonel)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={create.isPending}>
        {create.isPending ? "Ekleniyor..." : "Veli Ekle"}
      </button>
    </form>
  );
}

function ChildAdder({ guardianId, onAdded }: { guardianId: number; onAdded: () => void }) {
  const [name, setName] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      (await api.post("/children", { fullName: name, guardianId })).data,
    onSuccess: () => {
      setName("");
      onAdded();
    },
  });
  return (
    <div className="flex gap-2">
      <input
        className="input"
        placeholder="Cocuk adi"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        className="btn-ghost whitespace-nowrap"
        onClick={() => name.trim() && add.mutate()}
        disabled={add.isPending}
      >
        Ekle
      </button>
    </div>
  );
}

export default function Guardians() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const guardians = useQuery({
    queryKey: ["guardians", "manage", search],
    queryFn: async () =>
      (await api.get<Guardian[]>("/guardians", { params: { q: search } })).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["guardians"] });
  }

  const deleteGuardian = useMutation({
    mutationFn: async (id: number) => api.delete(`/guardians/${id}`),
    onSuccess: refresh,
  });
  const deleteChild = useMutation({
    mutationFn: async (id: number) => api.delete(`/children/${id}`),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Veliler & Cocuklar</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <GuardianForm onCreated={refresh} />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <input
            className="input"
            placeholder="Veli ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {guardians.isLoading ? (
            <p className="text-sm text-slate-500">Yukleniyor...</p>
          ) : (
            guardians.data?.map((g) => (
              <div key={g.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{g.fullName}</div>
                    <div className="text-sm text-slate-500">{g.phone}</div>
                    {g.note && <div className="text-xs text-slate-400">{g.note}</div>}
                  </div>
                  <button
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => {
                      if (confirm(`${g.fullName} silinsin mi?`)) deleteGuardian.mutate(g.id);
                    }}
                  >
                    Sil
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500">Cocuklar</div>
                  {g.children && g.children.length > 0 ? (
                    <ul className="space-y-1">
                      {g.children.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-sm"
                        >
                          <span>{c.fullName}</span>
                          <button
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => deleteChild.mutate(c.id)}
                          >
                            kaldir
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">Henuz cocuk eklenmemis.</p>
                  )}
                </div>

                <ChildAdder guardianId={g.id} onAdded={refresh} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
