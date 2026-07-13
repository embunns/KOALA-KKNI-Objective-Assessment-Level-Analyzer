"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import jsPDF from "jspdf";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { confidenceLabel } from "@/lib/utils";

type Step = "idle" | "uploading" | "extracting" | "analyzing" | "done" | "error";

export default function AnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  });

  function handleExportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analisis-${slugify(result.trainingTitle || "dokumen")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    if (!result) return;
    const doc = new jsPDF();
    const marginLeft = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - marginLeft * 2;
    let y = 18;

    const addTitle = (text: string) => {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(text, marginLeft, y);
      y += 8;
    };
    const addLabel = (label: string, value: string) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, marginLeft, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(value || "-", maxWidth - 35);
      doc.text(lines, marginLeft + 38, y);
      y += Math.max(6, lines.length * 5);
    };
    const addParagraph = (label: string, text: string) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(label, marginLeft, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(text || "Tidak ditemukan", maxWidth);
      doc.text(lines, marginLeft, y);
      y += lines.length * 5 + 4;
    };
    const ensureSpace = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 18;
      }
    };

    addTitle("Laporan Analisis KKNI Competency Analyzer");
    doc.setDrawColor(220);
    doc.line(marginLeft, y, pageWidth - marginLeft, y);
    y += 8;

    addLabel("Nama Training", result.trainingTitle || "Tidak ditemukan");
    addLabel("Tanggal Analisis", new Date().toLocaleString("id-ID"));
    addLabel("Level KKNI", `Level ${result.recommendedLevel ?? "-"}`);
    addLabel("Confidence", `${result.confidence ?? "-"}%`);
    addLabel("Status", result.status || "-");
    addLabel("Bloom Dominan", result.dominantBloom || "Tidak ditemukan");
    addLabel("Sumber Penentuan", result.aiUsed ? "Ditentukan oleh AI" : "Rule-based");
    y += 4;

    ensureSpace(20);
    addParagraph("KKO yang Ditemukan", (result.detectedKKO || []).map((k: any) => `${k.word} (${k.frequency}x)`).join(", "));

    ensureSpace(30);
    addParagraph("Justifikasi", result.justification || "Tidak ditemukan");

    if (result.matchedHistory?.length) {
      ensureSpace(20);
      addParagraph(
        "Histori yang Mirip",
        result.matchedHistory.map((h: any) => `${h.trainingName} (Level ${h.kkniLevel}, ${h.similarity}% mirip)`).join("; ")
      );
    }

    doc.save(`analisis-${slugify(result.trainingTitle || "dokumen")}.pdf`);
  }

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "dokumen";
  }

  async function handleAnalyze() {
    if (!file) return;
    setError(null);
    setStep("uploading");
    const formData = new FormData();
    formData.append("file", file);

    try {
      setStep("extracting");
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      setStep("analyzing");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analisis gagal. Silakan lakukan analisis ulang.");
      setResult(data.analysis);
      setStep("done");
    } catch (e: any) {
      setError(e.message);
      setStep("error");
    }
  }

  return (
    <div>
      <Topbar title="Analisis Dokumen" />
      <div className="p-6 space-y-6">
        <Card>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer ${
              isDragActive ? "border-primary bg-blue-50" : "border-border"
            }`}
          >
            <input {...getInputProps()} aria-label="Upload PDF" />
            <p className="text-gray-600">
              {file ? file.name : "Drag & drop file PDF di sini, atau klik untuk memilih file"}
            </p>
            <p className="text-xs text-gray-400 mt-1">Maks 20MB, hanya .pdf</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAnalyze} disabled={!file || (step !== "idle" && step !== "done" && step !== "error")}>
              {step === "idle" || step === "done" || step === "error" ? "Mulai Analisis" : "Menganalisis..."}
            </Button>
          </div>
        </Card>

        {step !== "idle" && (
          <Card>
            <p className="font-medium mb-3">Status Analisis</p>
            <ol className="flex flex-wrap gap-4 text-sm">
              {["uploading", "extracting", "analyzing", "done"].map((s, i) => (
                <li key={s} className={`flex items-center gap-2 ${stepReached(step, s as Step) ? "text-primary" : "text-gray-400"}`}>
                  <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">{i + 1}</span>
                  {labelForStep(s as Step)}
                </li>
              ))}
            </ol>
            {step === "error" && <p className="text-danger text-sm mt-3">{error}</p>}
          </Card>
        )}

        {result && (
          <>
            <Card>
              <p className="text-sm text-gray-500">Nama Training</p>
              <p className="text-lg font-semibold">{result.trainingTitle || "Tidak ditemukan"}</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Level KKNI</p>
                <div className="flex items-center gap-2">
                  <Badge tone={result.aiUsed ? "default" : "default"}>{result.aiUsed ? "Ditentukan oleh AI" : "Rule-based"}</Badge>
                  <Badge tone={result.status === "Needs Manual Review" ? "warning" : "success"}>{result.status}</Badge>
                </div>
              </div>
              <p className="text-3xl font-semibold text-primary mb-3">Level {result.recommendedLevel}</p>
              <p className="text-sm text-gray-500 mb-1">Confidence: {result.confidence}% ({confidenceLabel(result.confidence)})</p>
              <ProgressBar value={result.confidence} />
              {result.confidence < 70 && (
                <p className="text-sm text-warning mt-3">
                  Analisis memerlukan review Admin karena informasi dalam dokumen belum cukup untuk menentukan Level KKNI secara meyakinkan.
                </p>
              )}
            </Card>

            <Card>
              <p className="font-medium mb-2">Bloom Dominan: <Badge>{result.dominantBloom || "Tidak ditemukan"}</Badge></p>
              <p className="font-medium mt-4 mb-2">KKO yang Ditemukan</p>
              <div className="flex flex-wrap gap-2">
                {(result.detectedKKO || []).map((k: any) => (
                  <Badge key={k.word}>✔ {k.word} ({k.frequency}x)</Badge>
                ))}
              </div>
            </Card>

            <Card>
              <p className="font-medium mb-3">Skor per Aspek (Explainability)</p>
              <ul className="space-y-2 text-sm">
                {Object.entries(result.aspectScores || {}).map(([aspect, score]: any) => (
                  <li key={aspect} className="flex items-center gap-3">
                    <span className="w-56 capitalize">{aspect}</span>
                    <div className="flex-1"><ProgressBar value={score} /></div>
                    <span className="w-10 text-right">{Math.round(score)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <p className="font-medium mb-2">Justifikasi</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.justification}</p>
            </Card>

            {(result.matchedHistory || []).length > 0 && (
              <Card>
                <p className="font-medium mb-3">Histori yang Mirip</p>
                <ul className="space-y-1 text-sm">
                  {result.matchedHistory.map((h: any) => (
                    <li key={h.trainingId} className="flex justify-between">
                      <span>{h.trainingName}</span>
                      <span className="text-gray-500">Level {h.kkniLevel} · {h.similarity}%</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleExportPdf}>Export PDF</Button>
              <Button variant="secondary" onClick={handleExportJson}>Export JSON</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function stepReached(current: Step, target: Step) {
  const order: Step[] = ["uploading", "extracting", "analyzing", "done"];
  return order.indexOf(current) >= order.indexOf(target) || current === "done";
}

function labelForStep(s: Step) {
  const labels: Record<string, string> = {
    uploading: "Upload", extracting: "Extract", analyzing: "Analisis", done: "Selesai",
  };
  return labels[s] || s;
}
