"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; // ← import shared client
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);
    setMessage("Check your email to confirm your account.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-4 w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold">Create account</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-500 text-sm">{message}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={handleSignup}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium"
        >
          Sign up
        </button>
        <p className="text-sm text-center">
          Already have an account?{" "}
          <a href="/login" className="underline">Sign in</a>
        </p>
      </div>
    </main>
  );
}