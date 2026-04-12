export default function ModeChooserScreen({ onChooseCloud, onChooseLocal }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col justify-center gap-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Launch Mode</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">WorkWindow</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Explore the planner right away in local mode, or wire up cloud sync later for authenticated, cross-device
            access with your own Supabase project.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Local First</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-50">Try the product instantly</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Great for portfolio reviewers and quick evaluation. Your board lives in local storage with import and
              export support, and no external services are required.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">
              <li>Runs immediately after `npm install` and `npm run dev`</li>
              <li>Uses the full board, calendar, dependency, and metrics workflow</li>
              <li>Perfect for demoing the UX without provisioning infrastructure</li>
            </ul>
            <button
              type="button"
              onClick={onChooseLocal}
              className="mt-6 inline-flex rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Open Local Mode
            </button>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">Cloud Sync</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-50">Set up hosted sync</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Use Supabase Auth and Postgres to keep the same workspace available across devices, then deploy the
              frontend wherever you like.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">
              <li>Magic-link authentication with user-scoped storage</li>
              <li>Optional Vercel deployment path for mobile access</li>
              <li>Best for evaluating architecture and production-readiness</li>
            </ul>
            <button
              type="button"
              onClick={onChooseCloud}
              className="mt-6 inline-flex rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/10"
            >
              View Cloud Setup
            </button>
          </article>
        </div>
      </section>
    </main>
  )
}
