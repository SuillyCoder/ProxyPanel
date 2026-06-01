"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-semibold">Research Panel</h1>
      <p className="text-muted-foreground">Welcome! Upload a manuscript to get started.</p>
      <div className="flex gap-4">
        <button
          onClick={() => router.push("/upload")}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium"
        >
          Upload Manuscript
        </button>
        <button
          onClick={() => router.push("/session")}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium"
        >
          View Panel Sessions
        </button>
        <button
          onClick={handleLogout}
          className="border rounded px-4 py-2 text-sm"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}