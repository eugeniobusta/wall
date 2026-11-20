"use client";
import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { supabase } from "./useWall";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
    setBusy(false);
  }

  return (
    <main className="login">
      <form onSubmit={submit}>
        <Logo size={88} />
        <h1>Wall</h1>
        <p className="lede">Sign in to your wall.</p>
        <div className="cells">
          <div className="cell"><input className="plain" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" /></div>
          <div className="cell"><input className="plain" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-label="Password" /></div>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="capsule primary wide" disabled={busy}>{busy ? "Signing In" : "Sign In"}</button>
        <p className="foot">This wall belongs to one person. You stay signed in on this device.</p>
        <Link className="quiet-link" href="/?about">What is Wall?</Link>
      </form>
    </main>
  );
}
