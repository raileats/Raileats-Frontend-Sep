export default function BookingPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[640px] px-2 pt-4 pb-28">
      {children}
    </main>
  );
}
