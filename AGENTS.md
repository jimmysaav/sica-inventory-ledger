<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## SICA rules
- Domain logic lives in `src/lib/sica/engine.ts` as pure functions; UI calls them via `run()` — keeps rules testable and portable to a future server.
- Stock balances are never stored; they are derived from applied folios (`calcularSaldos`) — required auditability.
- Prototype persistence is browser localStorage (`store.ts`); replace with server DB per `docs/modelo-relacional.sql`.
