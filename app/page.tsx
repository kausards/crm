export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div className="max-w-2xl p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800 rounded-full">
          Backend API Ready
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
          Inventory, Courier & Accounts SaaS
        </h1>
        <p className="text-slate-400 mb-6 text-sm sm:text-base">
          Multi-tenant platform for BD e-commerce businesses with strict Postgres RLS isolation,
          AES-256-GCM encrypted courier credentials, and deterministic financial accounting.
        </p>
        <div className="grid grid-cols-2 gap-3 text-left text-xs bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 mb-6 font-mono text-slate-300">
          <div>✓ Supabase RLS Active</div>
          <div>✓ Steadfast / Pathao / RedX</div>
          <div>✓ Deterministic P&L Engine</div>
          <div>✓ SSLCommerz Subscriptions</div>
          <div>✓ ExcelJS Monthly Export</div>
          <div>✓ Zero-Vulnerability Audit</div>
        </div>
        <a
          href="/api/health"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
        >
          Check API Health
        </a>
      </div>
    </main>
  );
}
