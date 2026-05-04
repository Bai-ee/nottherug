export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Override the global cream body background for all admin routes */}
      <style>{`html, body { background: #55624C !important; margin: 0; padding: 0; }`}</style>
      {children}
    </>
  );
}
