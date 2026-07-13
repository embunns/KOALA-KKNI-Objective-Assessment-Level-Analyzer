"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileSearch, History, BookOpenText, ListChecks,
  Database, Info, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const MENU = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analysis", label: "Analisis Dokumen", icon: FileSearch },
  { href: "/history", label: "Riwayat Analisis", icon: History },
  { href: "/kkni", label: "Database KKNI", icon: BookOpenText },
  { href: "/kko", label: "Database KKO", icon: ListChecks },
  { href: "/training-history", label: "Database Histori", icon: Database },
  { href: "/about-kkni", label: "Tentang KKNI", icon: Info },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleConfirmLogout() {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-[280px] shrink-0 bg-white border-r border-border h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-6 border-b border-border flex items-center">
        <img src="/branding/logo.png" alt="Logo Perusahaan" className="h-20 w-auto" />
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {MENU.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-gradient-to-r from-[#EEEBFB] to-[#F5F0FC] text-primaryDark"
                : "text-gray-500 hover:bg-[#FAFAFE] hover:text-text"
            )}
          >
            {pathname === href && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-gradient-to-b from-purple-500 to-indigo-500" />
            )}
            <Icon size={18} aria-label={label} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setConfirmOpen(true)}
          title="Logout"
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-500 hover:bg-[#FAFAFE] hover:text-text transition-colors"
        >
          <LogOut size={18} aria-label="Logout" /> Logout
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <p className="font-medium mb-2">Keluar dari akun?</p>
            <p className="text-sm text-gray-600 mb-5">Anda akan logout dari KKNI Competency Analyzer.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={loggingOut}>Batal</Button>
              <Button variant="danger" onClick={handleConfirmLogout} disabled={loggingOut}>
                {loggingOut ? "Keluar..." : "Ya, Logout"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}