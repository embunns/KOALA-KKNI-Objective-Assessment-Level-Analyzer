export function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-success" : value >= 60 ? "bg-warning" : "bg-danger";
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden" aria-label={`Confidence ${value}%`}>
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}
