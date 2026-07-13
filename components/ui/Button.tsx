import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({ className, variant = "primary", ...props }: Props) {
  const variants = {
    primary:
      "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-400 hover:to-indigo-400 shadow-sm",
    secondary: "bg-white text-text border border-border hover:bg-[#F5F4FC]",
    danger: "bg-danger text-white hover:bg-red-700",
  };
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}