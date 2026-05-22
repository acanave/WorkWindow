export default function CloudSetupScreen({ onBack, onChooseLocal }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f1421] px-4 py-10 text-[#edf4ff]">
      <section className="w-full max-w-2xl rounded-3xl border border-[#2b384d] bg-[#172031] p-7 shadow-2xl shadow-slate-950/25">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Cloud Setup</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Bring your own Supabase project</h1>
        <p className="mt-4 text-sm leading-7 text-[#c8d3e3]">
          This branch keeps cloud sync generic and reusable. To enable it, add your own Supabase URL and publishable
          key, run the SQL bootstrap, and then restart the app.
        </p>

        <ol className="mt-6 space-y-3 text-sm text-[#c8d3e3]">
          <li>1. Copy `.env.example` to `.env.local`.</li>
          <li>2. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.</li>
          <li>3. Run `docs/supabase.sql` in your Supabase SQL editor.</li>
          <li>4. Check Auth Hooks and email settings in the Supabase dashboard if magic links are blocked.</li>
          <li>5. Restart the dev server or redeploy your hosted app.</li>
        </ol>

        <div className="mt-6 rounded-2xl border border-[#2b384d] bg-[#111a2a] p-4 text-sm text-[#c8d3e3]">
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
            className="rounded-2xl border border-[#2b384d] px-4 py-3 text-sm font-semibold text-[#c8d3e3] transition hover:bg-[#111a2a]"
          >
            Back
          </button>
        </div>
      </section>
    </main>
  )
}
