export default function CloudSetupScreen({ onBack, onChooseLocal }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-slate-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Cloud Setup</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Bring your own Supabase project</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          This branch keeps cloud sync generic and reusable. To enable it, add your own Supabase URL and publishable
          key, run the SQL bootstrap, and then restart the app.
        </p>

        <ol className="mt-6 space-y-3 text-sm text-slate-300">
          <li>1. Copy `.env.example` to `.env.local`.</li>
          <li>2. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.</li>
          <li>3. Run `docs/supabase.sql` in your Supabase SQL editor.</li>
          <li>4. Restart the dev server or redeploy your hosted app.</li>
        </ol>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
          Local mode remains fully available without external services, so reviewers can explore the product immediately
          and add cloud sync only when they want to evaluate the hosted architecture.
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onChooseLocal}
            className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Open Local Mode
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Back
          </button>
        </div>
      </section>
    </main>
  )
}
