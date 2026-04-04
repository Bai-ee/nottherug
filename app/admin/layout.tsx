export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Override the global cream body background for all admin routes */}
      <style>{`html, body { background: #1F2318 !important; margin: 0; padding: 0; }`}</style>
      {children}
    </>
  );
}
