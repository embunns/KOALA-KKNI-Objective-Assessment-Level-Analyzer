"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { confidenceLabel } from "@/lib/utils";

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ recommendedLevel: 0, status: "Completed", justification: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/history/${id}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setForm({
          recommendedLevel: d.recommendedLevel ?? 0,
          status: d.status,
          justification: d.justification ?? "",
        });
      });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    // Begitu Admin menyimpan koreksi manual, status otomatis dianggap "Completed"
    // -- artinya dokumen ini sudah ditinjau manusia, jadi peringatan "Needs Manual
    // Review" tidak relevan lagi ditampilkan.
    const payload = { ...form, status: "Completed" };
    const res = await fetch(`/api/history/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();
    setData(updated);
    setEditing(false);
    setSaving(false);
  }

  if (!data) return <div><Topbar title="Detail Analisis" /><p className="p-6 text-sm text-gray-500">Memuat...</p></div>;

  function handleExportPdf() {
    const doc = new jsPDF();
    const margin = 14;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 18;
    const line = (label: string, value: string, bold = false) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const text = label ? `${label}: ${value}` : value;
      const wrapped = doc.splitTextToSize(text, maxWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5 + 2;
    };
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Laporan Riwayat Analisis KKNI", margin, y);
    y += 10;
    line("Nama Training", data.trainingTitle || data.document?.originalName || "-");
    line("Tanggal Analisis", new Date(data.createdAt).toLocaleString("id-ID"));
    line("Level KKNI", `Level ${data.recommendedLevel ?? "-"}`);
    line("Sumber Dokumen", data.documentSource || "-");
    line("Status", data.status || "-");
    line("Bloom Dominan", data.dominantBloom || "Tidak ditemukan");
    line("Ditentukan Oleh", data.aiUsed ? "AI (dokumen Non-BNSP)" : "Rule-based");
    y += 4;
    line("", "Justifikasi:", true);
    line("", data.justification || "Tidak ditemukan");
    doc.save(`riwayat-${(data.trainingTitle || "analisis").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  }


  const learningOutcomes: string[] = Array.isArray(data.learningOutcomes) ? data.learningOutcomes : [];
  const materials: string[] = Array.isArray(data.materials) ? data.materials : [];
  const candidateLevels: { level: number; score: number }[] = Array.isArray(data.candidateLevels) ? data.candidateLevels : [];
  const matchedHistory: any[] = Array.isArray(data.matchedHistory) ? data.matchedHistory : [];
  const detectedKKO: any[] = Array.isArray(data.detectedKKO) ? data.detectedKKO : [];
  const aspectScores: Record<string, number> = data.aspectScores || {};

  return (
    <div>
      <Topbar title="Detail Analisis" />
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex justify-between items-center">
          <Button variant="secondary" onClick={() => router.push("/history")}>&larr; Kembali ke Riwayat</Button>
          <Button variant="secondary" onClick={handleExportPdf}>Download PDF</Button>
        </div>

        <Card>
          <p className="text-sm text-gray-500">Nama Training</p>
          <p className="text-lg font-semibold">{data.trainingTitle || data.document?.originalName}</p>
          <p className="text-xs text-gray-400 mt-1">
            Nama file: {data.document?.originalName} · Dianalisis: {new Date(data.createdAt).toLocaleString("id-ID")}
          </p>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-3">
            <p className="font-medium">Level KKNI &amp; Confidence</p>
            {!editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit (Koreksi Admin)</Button>}
          </div>

          {!editing ? (
            <>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="text-3xl font-semibold text-primary">Level {data.recommendedLevel ?? "-"}</p>
                <Badge>{data.documentSource === "BNSP" ? "BNSP (Rule-based)" : data.aiUsed ? "Non-BNSP (AI)" : "Non-BNSP (Rule-based)"}</Badge>
                <Badge tone={data.status === "Completed" ? "success" : data.status === "Failed" ? "danger" : "warning"}>
                  {data.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mb-1">
                Confidence: {data.confidence ?? "-"}% {data.confidence != null && `(${confidenceLabel(data.confidence)})`}
              </p>
              {data.confidence != null && <ProgressBar value={data.confidence} />}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Level KKNI (1-9)</label>
                <input
                  type="number" min={1} max={9}
                  value={form.recommendedLevel}
                  onChange={(e) => setForm({ ...form, recommendedLevel: Number(e.target.value) })}
                  className="border border-border rounded-md px-3 py-2 text-sm w-32"
                />
              </div>
              <p className="text-xs text-gray-500 bg-[#F5F4FC] rounded-md px-3 py-2">
                Status otomatis berubah menjadi <span className="font-medium">Completed</span> setelah koreksi ini disimpan.
              </p>
              <div>
                <label className="text-sm font-medium block mb-1">Justifikasi</label>
                <textarea
                  value={form.justification}
                  onChange={(e) => setForm({ ...form, justification: e.target.value })}
                  rows={4}
                  className="border border-border rounded-md px-3 py-2 text-sm w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Batal</Button>
              </div>
            </div>
          )}
        </Card>

        {candidateLevels.length > 0 && (
          <Card>
            <p className="font-medium mb-3">Kandidat Level (3 Tertinggi)</p>
            <ul className="space-y-2 text-sm">
              {candidateLevels.map((c) => (
                <li key={c.level} className="flex items-center gap-3">
                  <span className="w-20">Level {c.level}</span>
                  <div className="flex-1"><ProgressBar value={c.score} /></div>
                  <span className="w-12 text-right">{c.score}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {Object.keys(aspectScores).length > 0 && (
          <Card>
            <p className="font-medium mb-3">Skor per Aspek (Explainability)</p>
            <ul className="space-y-2 text-sm">
              {Object.entries(aspectScores).map(([aspect, score]) => (
                <li key={aspect} className="flex items-center gap-3">
                  <span className="w-56 capitalize">{aspect}</span>
                  <div className="flex-1"><ProgressBar value={Number(score)} /></div>
                  <span className="w-10 text-right">{Math.round(Number(score))}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {!editing && (
          <Card>
            <p className="font-medium mb-2">Justifikasi</p>
            <p className="text-sm text-gray-700 leading-relaxed">{data.justification || "Tidak ditemukan"}</p>
          </Card>
        )}

        {data.reasoning && (
          <Card>
            <p className="font-medium mb-2">Reasoning (Jejak Penalaran)</p>
            <p className="text-sm text-gray-700 leading-relaxed">{data.reasoning}</p>
          </Card>
        )}

        <Card>
          <p className="font-medium mb-2">Bloom Dominan: <Badge>{data.dominantBloom || "Tidak ditemukan"}</Badge></p>
          <div className="flex flex-wrap gap-2 mt-2">
            {detectedKKO.length === 0 && <p className="text-sm text-gray-500">Tidak ada KKO terdeteksi.</p>}
            {detectedKKO.map((k: any) => (
              <Badge key={k.word}>✔ {k.word} ({k.frequency}x)</Badge>
            ))}
          </div>
        </Card>

        {learningOutcomes.length > 0 && (
          <Card>
            <p className="font-medium mb-2">Learning Outcome</p>
            {learningOutcomes.map((lo, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1">{lo}</p>
            ))}
          </Card>
        )}

        {materials.length > 0 && (
          <Card>
            <p className="font-medium mb-2">Materi</p>
            {materials.map((m, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1">{m}</p>
            ))}
          </Card>
        )}

        {matchedHistory.length > 0 && (
          <Card>
            <p className="font-medium mb-3">Histori yang Mirip</p>
            <ul className="space-y-1 text-sm">
              {matchedHistory.map((h: any) => (
                <li key={h.trainingId} className="flex justify-between">
                  <span>{h.trainingName}</span>
                  <span className="text-gray-500">Level {h.kkniLevel} · {h.similarity}%</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}