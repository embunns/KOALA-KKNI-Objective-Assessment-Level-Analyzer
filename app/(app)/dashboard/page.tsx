import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/layout/Topbar";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [docCount, analysisCount, historyCount, kkniCount, levelDistribution] = await Promise.all([
    prisma.uploadedDocument.count(),
    prisma.analysisHistory.count(),
    prisma.trainingHistory.count(),
    prisma.kKNILevel.count(),
    prisma.analysisHistory.groupBy({ by: ["recommendedLevel"], _count: true }),
  ]);

  const recent = await prisma.analysisHistory.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { document: true },
  });

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><p className="text-sm text-gray-500">Total Dokumen</p><p className="text-3xl font-semibold mt-1">{docCount}</p></Card>
          <Card><p className="text-sm text-gray-500">Total Analisis</p><p className="text-3xl font-semibold mt-1">{analysisCount}</p></Card>
          <Card><p className="text-sm text-gray-500">Total Histori</p><p className="text-3xl font-semibold mt-1">{historyCount}</p></Card>
          <Card><p className="text-sm text-gray-500">Total KKNI</p><p className="text-3xl font-semibold mt-1">{kkniCount}</p></Card>
        </div>

        <Card>
          <p className="font-medium mb-3">Distribusi Level KKNI</p>
          {levelDistribution.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada data analisis.</p>
          ) : (
            <ul className="space-y-2">
              {levelDistribution.map((d: any) => (
                <li key={d.recommendedLevel} className="flex items-center gap-3 text-sm">
                  <span className="w-20">Level {d.recommendedLevel}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(d._count / analysisCount) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right">{d._count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="font-medium mb-3">Recent Analysis</p>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada dokumen. Silakan upload PDF.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((r: any) => (
                <li key={r.id} className="py-2 text-sm flex justify-between">
                  <span>{r.trainingTitle || r.document.originalName}</span>
                  <span className="text-gray-500">Level {r.recommendedLevel ?? "-"} · {r.confidence ?? "-"}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
