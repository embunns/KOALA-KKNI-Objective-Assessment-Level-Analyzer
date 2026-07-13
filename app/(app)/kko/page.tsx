"use client";
import { useEffect, useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";

interface Bloom { id: string; category: string; code: string; name: string; }
interface Kko { id: string; word: string; description: string | null; bloom: Bloom; }

export default function KkoPage() {
  const [kkoList, setKkoList] = useState<Kko[]>([]);
  const [bloomList, setBloomList] = useState<Bloom[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Kko | null>(null);
  const [form, setForm] = useState({ word: "", bloomId: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Kko | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"skip" | "update">("skip");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notice, setNotice] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [kkoRes, bloomRes] = await Promise.all([fetch("/api/kko"), fetch("/api/bloom")]);
    setKkoList(await kkoRes.json());
    setBloomList(await bloomRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAddForm() {
    setEditing(null);
    setForm({ word: "", bloomId: bloomList[0]?.id || "", description: "" });
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(k: Kko) {
    setEditing(k);
    setForm({ word: k.word, bloomId: k.bloom.id, description: k.description || "" });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmitForm() {
    setSaving(true);
    setFormError(null);
    const payload = { word: form.word.trim().toLowerCase(), bloomId: form.bloomId, description: form.description || undefined };

    const res = editing
      ? await fetch("/api/kko", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
      : await fetch("/api/kko", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      setFormOpen(false);
      await loadData();
    } else {
      const data = await res.json().catch(() => null);
      setFormError(data?.error?.formErrors?.join(", ") || "Kata kerja ini mungkin sudah ada di database.");
    }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/kko?id=${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setKkoList((prev) => prev.filter((k) => k.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      setNotice("Gagal menghapus data.");
    }
    setDeleting(false);
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("mode", importMode);
    const res = await fetch("/api/kko/import", { method: "POST", body: formData });
    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    if (res.ok) await loadData();
  }

  function closeImport() {
    setImportOpen(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <Topbar title="Database KKO" />
      <div className="p-6">
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>Import Excel</Button>
          <Button onClick={openAddForm}>+ Tambah</Button>
        </div>
        <Card>
          {loading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Memuat data...</p>
          ) : (
            <Table headers={["Kata Kerja", "Kategori", "Bloom", "Deskripsi", "Aksi"]}>
              {kkoList.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-gray-500">Belum ada data KKO.</td></tr>
              ) : (
                kkoList.map((k) => (
                  <tr key={k.id} className="border-b border-border last:border-0">
                    <td className="py-2 px-3 capitalize">{k.word}</td>
                    <td className="py-2 px-3">{k.bloom.category}</td>
                    <td className="py-2 px-3">{k.bloom.code} - {k.bloom.name}</td>
                    <td className="py-2 px-3 max-w-xs truncate" title={k.description || ""}>{k.description || "-"}</td>
                    <td className="py-2 px-3 space-x-2 whitespace-nowrap">
                      <button onClick={() => openEditForm(k)} className="text-primary text-xs" title="Edit">Edit</button>
                      <button onClick={() => setDeleteTarget(k)} className="text-danger text-xs" title="Hapus">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </Table>
          )}
        </Card>
      </div>

      {/* Modal Tambah/Edit */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <p className="font-medium mb-4">{editing ? "Edit KKO" : "Tambah KKO"}</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Kata Kerja</label>
                <input
                  value={form.word}
                  onChange={(e) => setForm({ ...form, word: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                  placeholder="mis. menganalisis"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Kategori Bloom</label>
                <select
                  value={form.bloomId}
                  onChange={(e) => setForm({ ...form, bloomId: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                >
                  {bloomList.map((b) => (
                    <option key={b.id} value={b.id}>{b.code} - {b.name} ({b.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Deskripsi (opsional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                />
              </div>
              {formError && <p className="text-danger text-sm">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button>
              <Button onClick={handleSubmitForm} disabled={saving || !form.word || !form.bloomId}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <p className="font-medium mb-2">Hapus KKO?</p>
            <p className="text-sm text-gray-600 mb-5">
              Kata kerja <span className="font-medium capitalize">&quot;{deleteTarget.word}&quot;</span> akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Batal</Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel */}
      {importOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <p className="font-medium mb-4">Import KKO dari Excel</p>

            {!importResult ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="text-sm mb-4"
                />
                <p className="text-xs text-gray-500 mb-4">
                  Format kolom: <span className="font-mono">word</span>, <span className="font-mono">bloomCode</span>, <span className="font-mono">description</span> (opsional).
                </p>
                <div className="mb-4">
                  <label className="text-sm font-medium block mb-1">Jika kata kerja sudah ada</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as "skip" | "update")}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="skip">Lewati (Skip)</option>
                    <option value="update">Perbarui (Update)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={closeImport} disabled={importing}>Batal</Button>
                  <Button onClick={handleImport} disabled={!importFile || importing}>
                    {importing ? "Mengimport..." : "Import"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm space-y-1 mb-5">
                  <p>✅ Ditambahkan: <span className="font-medium">{importResult.created}</span></p>
                  <p>🔄 Diperbarui: <span className="font-medium">{importResult.updated}</span></p>
                  <p>⏭️ Dilewati (sudah ada): <span className="font-medium">{importResult.skipped}</span></p>
                  {importResult.invalidBloom > 0 && (
                    <p className="text-warning">⚠️ Kode Bloom tidak dikenali: <span className="font-medium">{importResult.invalidBloom}</span></p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button onClick={closeImport}>Selesai</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <p className="text-sm text-gray-700 mb-5">{notice}</p>
            <div className="flex justify-end">
              <Button onClick={() => setNotice(null)}>Oke</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}