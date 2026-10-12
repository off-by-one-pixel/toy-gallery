export default function LiveDot({ className = 'h-1.5 w-1.5' }: Readonly<{ className?: string }>) {
  return (
    <span className={`relative flex shrink-0 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
      <span className="relative inline-flex h-full w-full rounded-full bg-live" />
    </span>
  );
}
