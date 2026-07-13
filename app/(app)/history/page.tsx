"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/history");
    const data = await res.json();
    setAnalyses(data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus hasil analisis "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert("Gagal menghapus data.");
    }
  }

  const filtered = analyses.filter((a) =>
    (a.trainingTitle || a.document?.originalName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Topbar title="Riwayat Analisis" />
      <div className="p-6">
        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama dokumen..."
            className="border border-border rounded-md px-3 py-2 text-sm w-64"
          />
        </div>
        <Card>
          {loading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Memuat data...</p>
          ) : (
            <Table headers={["Tanggal", "Nama Dokumen", "Level", "Confidence", "Status", "Aksi"]}>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">Belum ada riwayat analisis.</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="py-2 px-3">{new Date(a.createdAt).toLocaleDateString("id-ID")}</td>
                    <td className="py-2 px-3">{a.trainingTitle || a.document?.originalName}</td>
                    <td className="py-2 px-3">{a.recommendedLevel ?? "-"}</td>
                    <td className="py-2 px-3">{a.confidence ?? "-"}%</td>
                    <td className="py-2 px-3">
                      <Badge tone={a.status === "Completed" ? "success" : a.status === "Failed" ? "danger" : "warning"}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 space-x-3 whitespace-nowrap">
                      <Link href={`/history/${a.id}`} className="text-primary text-xs" title="Lihat">Lihat</Link>
                      <button
                        onClick={() => handleDelete(a.id, a.trainingTitle || a.document?.originalName)}
                        className="text-danger text-xs"
                        title="Hapus"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}