"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";

interface Kkni {
  id: string;
  level: number;
  description: string;
  knowledge: string;
  skill: string;
  responsibility: string;
}

const EMPTY_FORM = { level: 1, description: "", knowledge: "", skill: "", responsibility: "" };

export default function KkniPage() {
  const [levels, setLevels] = useState<Kkni[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Kkni | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Kkni | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/kkni");
    setLevels(await res.json());
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

  function openEditForm(l: Kkni) {
    setEditing(l);
    setForm({ level: l.level, description: l.description, knowledge: l.knowledge, skill: l.skill, responsibility: l.responsibility });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmitForm() {
    setSaving(true);
    setFormError(null);

    const res = editing
      ? await fetch("/api/kkni", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        })
      : await fetch("/api/kkni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

    if (res.ok) {
      setFormOpen(false);
      await loadData();
    } else {
      const data = await res.json().catch(() => null);
      setFormError(
        data?.error?.formErrors?.join(", ") ||
          `Gagal menyimpan. Level ${form.level} mungkin sudah ada di database.`
      );
    }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/kkni?id=${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setLevels((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      setNotice("Gagal menghapus data.");
    }
    setDeleting(false);
  }

  return (
    <div>
      <Topbar title="Database KKNI" />
      <div className="p-6">
        <div className="flex justify-end mb-4">
          <Button onClick={openAddForm}>+ Tambah Level</Button>
        </div>
        <Card>
          {loading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Memuat data...</p>
          ) : (
            <Table headers={["Level", "Deskripsi", "Pengetahuan", "Kemampuan", "Tanggung Jawab", "Aksi"]}>
              {levels.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">Belum ada data.</td></tr>
              ) : (
                levels.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 align-top">
                    <td className="py-2 px-3 font-medium">{l.level}</td>
                    <td className="py-2 px-3 max-w-xs">{l.description}</td>
                    <td className="py-2 px-3 max-w-xs">{l.knowledge}</td>
                    <td className="py-2 px-3 max-w-xs">{l.skill}</td>
                    <td className="py-2 px-3 max-w-xs">{l.responsibility}</td>
                    <td className="py-2 px-3 space-x-2 whitespace-nowrap">
                      <button onClick={() => openEditForm(l)} className="text-primary text-xs" title="Edit">Edit</button>
                      <button onClick={() => setDeleteTarget(l)} className="text-danger text-xs" title="Hapus">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </Table>
          )}
        </Card>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <p className="font-medium mb-4">{editing ? `Edit Level ${editing.level}` : "Tambah Level KKNI"}</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Level (1-9)</label>
                <input
                  type="number" min={1} max={9}
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                  disabled={!!editing}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm disabled:bg-gray-50"
                />
                {editing && <p className="text-xs text-gray-400 mt-1">Angka level tidak bisa diubah setelah dibuat.</p>}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Deskripsi</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Pengetahuan (Knowledge)</label>
                <textarea value={form.knowledge} onChange={(e) => setForm({ ...form, knowledge: e.target.value })} rows={2} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Kemampuan (Skill)</label>
                <textarea value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} rows={2} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Tanggung Jawab</label>
                <textarea value={form.responsibility} onChange={(e) => setForm({ ...form, responsibility: e.target.value })} rows={2} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              {formError && <p className="text-danger text-sm">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button>
              <Button onClick={handleSubmitForm} disabled={saving || !form.description}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <p className="font-medium mb-2">Hapus Level KKNI?</p>
            <p className="text-sm text-gray-600 mb-5">
              Level <span className="font-medium">{deleteTarget.level}</span> akan dihapus permanen.
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
