export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">OpenVideo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create professional videos at scale
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
