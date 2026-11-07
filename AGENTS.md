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
- Public quote requests are inserted only via a server function (service role); only the dispatcher email can read them via RLS — anonymous visitors must never read submissions.

- AI document scanning only fills form fields for dispatcher review; it never saves automatically (scanned values must be checked against originals).
