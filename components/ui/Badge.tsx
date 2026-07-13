import { cn } from "@/lib/utils";

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const tones = {
    default: "bg-[#EEEBFB] text-primaryDark",
    success: "bg-green-100 text-success",
    warning: "bg-amber-100 text-warning",
    danger: "bg-red-100 text-danger",
  };
  return <span className={cn("inline-block px-2 py-0.5 rounded-md text-xs font-medium", tones[tone])}>{children}</span>;
}