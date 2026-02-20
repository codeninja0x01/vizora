export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-52 rounded-lg bg-muted/50" />
        <div className="h-4 w-64 rounded-lg bg-muted/30" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] rounded-xl bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-64 rounded-xl bg-muted/40 lg:col-span-3" />
        <div className="space-y-5 lg:col-span-2">
          <div className="h-48 rounded-xl bg-muted/40" />
          <div className="h-36 rounded-xl bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
