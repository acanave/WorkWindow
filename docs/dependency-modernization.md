# Dependency modernization

The August 2026 modernization pass keeps Tailwind CSS on the latest 3.4 release instead of migrating to Tailwind CSS 4.

Tailwind 4 changes the PostCSS integration, CSS entry-point directives, configuration discovery, dark-mode variant setup, and parts of the generated base styles. WorkWindow's current Tailwind 3 pipeline is stable and supported, and moving to v4 would add visual-regression risk without enabling a product requirement in this maintenance pass.

Revisit the migration as a dedicated visual change. Compare Dashboard, Calendar, Boards, Projects, task details, and both appearances at the existing desktop screenshot viewport before accepting it.
