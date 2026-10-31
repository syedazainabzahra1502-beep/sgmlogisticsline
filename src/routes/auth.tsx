import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Dispatcher Sign In — SGM Global Line Logistics" },
      { name: "description", content: "Secure dispatcher sign-in for the SGM Global Line Logistics operations portal." },
      { property: "og:title", content: "Dispatcher Sign In — SGM Global Line Logistics" },
      { property: "og:description", content: "Sign in to save and review dispatch readiness history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("info@sgmlogisticsline.com");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg(error.message); else nav({ to: "/", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your inbox to confirm the account, then sign in.");
      else nav({ to: "/", replace: true });
    }
    setBusy(false);
  };
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-3 p-6">
        <p className="font-semibold">SGM Dispatcher {mode === "in" ? "Sign In" : "Account Setup"}</p>
        <label className="block"><span className="label-caps">Email</span><input type="email" required className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block"><span className="label-caps">Password</span><input type="password" required minLength={8} className="field mt-1" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
        {msg && <p className="text-sm text-pending">{msg}</p>}
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-xs text-muted-foreground underline">{mode === "in" ? "First time? Create the dispatcher account" : "Have an account? Sign in"}</button>
        <Link to="/" className="block text-xs text-muted-foreground">← Back to portal</Link>
      </form>
    </main>
  );
}
