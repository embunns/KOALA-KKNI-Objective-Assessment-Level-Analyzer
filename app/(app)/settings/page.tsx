import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const settings = await prisma.settings.findFirst();

  return (
    <div>
      <Topbar title="Pengaturan" />
      <div className="p-6 max-w-lg">
        <Card>
          <form className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Nama Website</label>
              <input defaultValue={settings?.websiteName} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Warna Utama</label>
              <input defaultValue={settings?.primaryColor} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Versi Analisis</label>
              <input defaultValue={settings?.analysisVersion} className="w-full border border-border rounded-md px-3 py-2 text-sm" disabled />
            </div>
            <Button type="submit">Simpan</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
