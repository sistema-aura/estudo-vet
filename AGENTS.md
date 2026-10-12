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

# AGENTS.md

- PDF text is extracted in the browser (pdfjs) and stored in `materials.content`; AI features read that column server-side, so the AI never needs to download files.
- AI calls live in `src/lib/ai.server.ts` and are exposed only through authenticated server functions in `src/lib/study.functions.ts`, keeping the API key server-side.
- No sign-in: app pages sit under the `_authenticated` layout without a guard (user chose a personal, login-free app); server functions use the publishable-key client.
- Data tables and the `materials` bucket have open RLS for anon/authenticated, since there are no accounts.
