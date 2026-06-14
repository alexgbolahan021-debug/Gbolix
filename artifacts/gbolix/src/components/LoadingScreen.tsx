export function LoadingScreen({ message }: { message?: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F14] gap-6"
      data-testid="loading-screen"
    >
      <img
        src="/logo-g-icon.png"
        alt="Gbolix"
        className="h-16 w-16 object-contain"
        style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
      />
      <div className="flex gap-1.5">
        {[0, 150, 300].map(delay => (
          <div
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{ animation: `bounce 1.2s ease-in-out infinite`, animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
