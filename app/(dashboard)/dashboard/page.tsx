"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
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
          onClick={handleLogout}
          className="border rounded px-4 py-2 text-sm"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}