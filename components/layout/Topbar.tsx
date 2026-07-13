export function Topbar({ title }: { title: string }) {
  return (
    <header className="h-16 border-b border-border bg-white/90 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-text">{title}</h1>
      <img src="/branding/peruri.png" alt="Peruri" className="h-24 w-auto" />
    </header>
  );
}