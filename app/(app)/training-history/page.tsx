"use client";
import { useEffect, useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";

interface Training {
  id: string;
  trainingName: string;
  provider: string | null;
  kkniLevel: number;
  unitCompetency: string;
  reference: string | null;
}

const EMPTY_FORM = { trainingName: "", provider: "", kkniLevel: 1, unitCompetency: "", reference: "" };

export default function TrainingHistoryPage() {
  const [list, setList] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Training | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"skip" | "update">("skip");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/training-history");
    setList(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAddForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(t: Training) {
    setEditing(t);
    setForm({
      trainingName: t.trainingName,
      provider: t.provider || "",
      kkniLevel: t.kkniLevel,
      unitCompetency: t.unitCompetency,
      reference: t.reference || "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmitForm() {
    setSaving(true);
    setFormError(null);
    const payload = {
      trainingName: form.trainingName.trim(),
      provider: form.provider.trim() || null,
      kkniLevel: Number(form.kkniLevel),
      unitCompetency: form.unitCompetency.trim(),
      reference: form.reference.trim() || null,
    };

    const res = editing
      ? await fetch("/api/training-history", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
      : await fetch("/api/training-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      setFormOpen(false);
      await loadData();
    } else {
      const data = await res.json().catch(() => null);
      setFormError(data?.error?.formErrors?.join(", ") || "Gagal menyimpan data.");
    }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/training-history?id=${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((t) => t.id !== deleteTarget.id));
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
    const res = await fetch("/api/training-history/import", { method: "POST", body: formData });
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
      <Topbar title="Database Histori" />
      <div className="p-6">
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>Import Excel</Button>
          <Button onClick={openAddForm}>+ Tambah</Button>
        </div>
        <Card>
          {loading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Memuat data...</p>
          ) : (
            <Table headers={["Nama Training", "Provider", "Level KKNI", "Unit Kompetensi", "Reference", "Aksi"]}>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">Belum ada data histori.</td></tr>
              ) : (
                list.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 align-top">
                    <td className="py-2 px-3">{t.trainingName}</td>
                    <td className="py-2 px-3">{t.provider || "-"}</td>
                    <td className="py-2 px-3">{t.kkniLevel}</td>
                    <td className="py-2 px-3 max-w-md truncate" title={t.unitCompetency}>{t.unitCompetency}</td>
                    <td className="py-2 px-3">
                      {t.reference ? <a href={t.reference} className="text-primary text-xs" target="_blank" rel="noreferrer">Link</a> : "-"}
                    </td>
                    <td className="py-2 px-3 space-x-2 whitespace-nowrap">
                      <button onClick={() => openEditForm(t)} className="text-primary text-xs" title="Edit">Edit</button>
                      <button onClick={() => setDeleteTarget(t)} className="text-danger text-xs" title="Hapus">Hapus</button>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <p className="font-medium mb-4">{editing ? "Edit Histori Training" : "Tambah Histori Training"}</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Nama Training</label>
                <input value={form.trainingName} onChange={(e) => setForm({ ...form, trainingName: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Provider (opsional)</label>
                <input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Level KKNI (1-9)</label>
                <input type="number" min={1} max={9} value={form.kkniLevel} onChange={(e) => setForm({ ...form, kkniLevel: Number(e.target.value) })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Unit Kompetensi</label>
                <textarea value={form.unitCompetency} onChange={(e) => setForm({ ...form, unitCompetency: e.target.value })} rows={3} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Reference (opsional, URL)</label>
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              {formError && <p className="text-danger text-sm">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button>
              <Button onClick={handleSubmitForm} disabled={saving || !form.trainingName || !form.unitCompetency}>
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
            <p className="font-medium mb-2">Hapus Histori Training?</p>
            <p className="text-sm text-gray-600 mb-5">
              <span className="font-medium">&quot;{deleteTarget.trainingName}&quot;</span> akan dihapus permanen.
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
            <p className="font-medium mb-4">Import Histori dari Excel</p>
            {!importResult ? (
              <>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="text-sm mb-4" />
                <p className="text-xs text-gray-500 mb-4">
                  Format kolom: <span className="font-mono">PELATIHAN</span>, <span className="font-mono">KKNI</span>, <span className="font-mono">UNIT KOMPETENSI</span>, <span className="font-mono">REFERENCE</span>.
                </p>
                <div className="mb-4">
                  <label className="text-sm font-medium block mb-1">Jika nama training sudah ada</label>
                  <select value={importMode} onChange={(e) => setImportMode(e.target.value as "skip" | "update")} className="w-full border border-border rounded-md px-3 py-2 text-sm">
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
