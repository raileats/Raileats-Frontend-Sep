export default function BookingFlowShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`mx-auto min-h-screen w-full max-w-[640px] px-2 pt-4 pb-28 ${className}`}
    >
      {children}
    </main>
  );
}
