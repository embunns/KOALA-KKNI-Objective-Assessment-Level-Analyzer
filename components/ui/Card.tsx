import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-card border border-border rounded-xl shadow-[0_1px_3px_rgba(76,29,149,0.06)] p-5", className)}>
      {children}
    </div>
  );
}