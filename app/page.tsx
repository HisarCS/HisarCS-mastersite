/**
 * Homepage — placeholder during Phase 0 (pipeline bring-up).
 * The pixel mark + Members/Projects carousel island lands in Phase 3.
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <div
        aria-hidden
        style={{ fontSize: 58, fontWeight: 700, letterSpacing: '-.05em', lineHeight: 1 }}
      >
        .<span style={{ color: 'var(--accent)' }}>)</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>ideaLab — rebuilding on Next.js</div>
    </main>
  );
}
