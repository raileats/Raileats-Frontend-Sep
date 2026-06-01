export default function PageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[640px] px-2 pb-28 pt-4">
      {children}
    </main>
  );
}
