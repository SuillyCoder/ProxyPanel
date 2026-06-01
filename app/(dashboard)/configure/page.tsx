"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ConfigurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manuscriptId = searchParams.get("manuscript_id");
  const title = searchParams.get("title");

  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStartSession() {
    if (!manuscriptId) return setError("No manuscript selected.");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");

      // Create session record in Supabase
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert([{
          user_id: session.user.id,
          manuscript_id: parseInt(manuscriptId),
          difficulty,
          num_questions: numQuestions,
        }])
        .select("id")
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error("Failed to create session."); 

            // After creating session, trigger question generation
        const genRes = await fetch("/api/py/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            session_id: sessionData.id,
            manuscript_id: parseInt(manuscriptId),
            difficulty,
            num_questions: numQuestions,
        }),
        });

        const genResult = await genRes.json();
        if (!genRes.ok) throw new Error(genResult.detail || "Failed to generate questions");

      // Redirect to question generation
      router.push(`/session/${sessionData.id}?manuscript_id=${manuscriptId}&difficulty=${difficulty}&num_questions=${numQuestions}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Configure Your Panel Session</h1>
        {title && <p className="text-muted-foreground text-sm">{decodeURIComponent(title)}</p>}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex flex-col gap-6 w-full max-w-sm">
        {/* Number of Questions */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Number of Questions: <span className="text-primary">{numQuestions}</span>
          </label>
          <input
            type="range"
            min={5}
            max={10}
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Difficulty</label>
          <div className="flex gap-3">
            {["easy", "medium", "hard"].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded text-sm font-medium border capitalize transition-colors ${
                  difficulty === d
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStartSession}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Setting up session..." : "Start Panel Session"}
        </button>

        <button
          onClick={() => router.push("/dashboard")}
          className="border rounded px-4 py-2 text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    </main>
  );
}