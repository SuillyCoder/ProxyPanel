"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; // ← import shared client
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    setLoading(false);
    
    console.log("data:", data);
    console.log("error:", error);
    console.log("session:", data?.session);

    if (error) return setError(error.message);
    if (data.session) {
      console.log("redirecting now...");
      window.location.replace("../dashboard");
    } else {
      setError("No session returned.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-4 w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
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
          onClick={handleLogin}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-sm text-center">
          No account?{" "}
          <a href="/signup" className="underline">Sign up</a>
        </p>
      </div>
    </main>
  );
}