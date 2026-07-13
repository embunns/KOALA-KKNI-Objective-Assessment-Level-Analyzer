"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { ChevronDown } from "lucide-react";

const SECTIONS = [
  { title: "Apa itu KKNI", content: "Kerangka Kualifikasi Nasional Indonesia (KKNI) adalah kerangka penjenjangan kualifikasi kompetensi yang menyandingkan, menyetarakan, dan mengintegrasikan bidang pendidikan dengan bidang pelatihan kerja dan pengalaman kerja." },
  { title: "Sejarah", content: "KKNI ditetapkan melalui Peraturan Presiden Nomor 8 Tahun 2012 sebagai acuan pokok dalam penetapan kualifikasi kompetensi secara nasional." },
  { title: "Tujuan", content: "Menetapkan kualifikasi capaian pembelajaran yang menghubungkan bidang pendidikan dan pelatihan kerja untuk memperoleh pengakuan kompetensi." },
  { title: "Manfaat", content: "Menjadi acuan penyetaraan kualifikasi antara pendidikan formal, non-formal, dan pengalaman kerja untuk dunia usaha maupun pengembangan karir." },
  { title: "Jenjang KKNI", content: "KKNI terdiri dari 9 jenjang kualifikasi, dari Level 1 (operator) hingga Level 9 (ahli/spesialis)." },
  { title: "Dokumen", content: "Rujukan resmi: Peraturan Presiden No. 8 Tahun 2012 tentang Kerangka Kualifikasi Nasional Indonesia." },
];

export default function AboutKkniPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      <Topbar title="Tentang KKNI" />
      <div className="p-6 space-y-2 max-w-3xl">
        {SECTIONS.map((s, i) => (
          <Card key={s.title} className="p-0 overflow-hidden">
            <button
              className="w-full flex justify-between items-center px-5 py-4 text-left font-medium"
              onClick={() => setOpen(open === i ? null : i)}
              aria-label={s.title}
            >
              {s.title}
              <ChevronDown size={16} className={open === i ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {open === i && <div className="px-5 pb-4 text-sm text-gray-600">{s.content}</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}
