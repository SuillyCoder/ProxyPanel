"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Session = {
  id: number;
  difficulty: string;
  num_questions: number;
  created_at: string;
  manuscript_id: number;
};

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");

    const { data, error } = await supabase
      .from("sessions")
      .select("id, difficulty, num_questions, created_at, manuscript_id")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

      console.log("Sessions data:", data, "Error: ", error);
      setSessions(data || []);
      setLoading(false);
    }
    fetchSessions();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Your Sessions</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="border rounded px-4 py-2 text-sm"
          >
            Back
          </button>
        </div>

        {loading && <p className="text-muted-foreground text-sm">Loading sessions...</p>}

        {!loading && sessions.length === 0 && (
          <p className="text-muted-foreground text-sm">No sessions yet. Upload a manuscript to get started.</p>
        )}

        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <div key={s.id} className="border rounded p-4 flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Session #{s.id}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {s.difficulty} · {s.num_questions} questions · {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => router.push(`/session/${s.id}`)}
                className="bg-primary text-primary-foreground rounded px-3 py-1.5 text-xs font-medium"
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}