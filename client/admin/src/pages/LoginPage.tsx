import { useState } from "react";
import { Loader2, Shield } from "lucide-react";

import { api } from "../api";
import { errorMessage } from "../components";
import type { AdminProfile } from "../types";

export function LoginPage({ onSignedIn }: { onSignedIn: (admin: AdminProfile) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      onSignedIn(await api.login(email.trim(), password));
    } catch (loginError) {
      setError(errorMessage(loginError, "Couldn't sign in."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="gate">
      <section className="gate-panel">
        <div className="brand-mark">
          <Shield size={30} />
        </div>
        <p className="eyebrow">FarmConnect Admin</p>
        <h1>Keep the community trustworthy</h1>
        <p className="muted">Sign in with your FarmConnect account. Only accounts with admin access can continue.</p>
        <form onSubmit={submit} className="gate-form">
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required autoFocus />
          </label>
          <label className="field">
            <span>Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="spin" size={17} /> : <Shield size={17} />}
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
