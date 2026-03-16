export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
