export function CardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 animate-pulse space-y-4">
      <div className="h-3 w-20 bg-muted rounded" />
      <div className="h-6 w-3/4 bg-muted rounded" />
      <div className="h-3 w-full bg-muted rounded" />
      <div className="h-3 w-5/6 bg-muted rounded" />
      <div className="flex gap-2 pt-2">
        <div className="h-5 w-14 bg-muted rounded-full" />
        <div className="h-5 w-12 bg-muted rounded-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      <div className="size-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      {label && <p className="mt-4 text-sm">{label}</p>}
    </div>
  );
}

export function ErrorBlock({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong.";
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
      <p className="font-medium text-destructive">Failed to load</p>
      <p className="text-muted-foreground mt-1">{msg}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-md border border-border hover:bg-muted text-foreground text-sm"
        >
          Try again
        </button>
      )}
    </div>
  );
}
