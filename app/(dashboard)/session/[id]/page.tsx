// app/(dashboard)/session/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Question = {
  id: number;
  question_text: string;
  order_index: number;
};

type Answer = {
  question_id: number;
  user_answer: string;
  time_taken_seconds: number;
};

const TIMER_SECONDS = 60;

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState("");

  // Fetch questions on load
  useEffect(() => {
    async function fetchQuestions() {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, order_index")
        .eq("session_id", sessionId)
        .order("order_index");

      if (error || !data || data.length === 0) {
        setError("No questions found for this session.");
        setLoading(false);
        return;
      }

      setQuestions(data);
      setLoading(false);
    }
    fetchQuestions();
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (loading || sessionComplete) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitAnswer(true); // auto-submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, loading, sessionComplete]);

  async function handleSubmitAnswer(timedOut = false) {
    if (submitting) return;
    setSubmitting(true);

    const currentQuestion = questions[currentIndex];
    const timeTaken = TIMER_SECONDS - timeLeft;

    const newAnswer: Answer = {
      question_id: currentQuestion.id,
      user_answer: timedOut && !answer.trim() ? "[No answer — timed out]" : answer.trim(),
      time_taken_seconds: timeTaken,
    };

    // Save to Supabase
    await supabase.from("answers").insert([{
      question_id: newAnswer.question_id,
      user_answer: newAnswer.user_answer,
      time_taken_seconds: newAnswer.time_taken_seconds,
    }]);

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Check if session is complete
    if (currentIndex + 1 >= questions.length) {
      setSessionComplete(true);
      setSubmitting(false);
      return;
    }

    // Move to next question
    setCurrentIndex((prev) => prev + 1);
    setAnswer("");
    setTimeLeft(TIMER_SECONDS);
    setSubmitting(false);
  }

  // Timer color based on time left
  const timerColor =
    timeLeft > 30 ? "text-green-600" :
    timeLeft > 10 ? "text-yellow-500" :
    "text-red-500";

  const timerBg =
    timeLeft > 30 ? "bg-green-100" :
    timeLeft > 10 ? "bg-yellow-100" :
    "bg-red-100";

  // Progress percentage
  const progress = questions.length > 0
    ? ((currentIndex) / questions.length) * 100
    : 0;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading session...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="border rounded px-4 py-2 text-sm"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  if (sessionComplete) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-4xl">🎓</div>
          <h1 className="text-2xl font-semibold">Session Complete!</h1>
          <p className="text-muted-foreground text-sm">
            You answered {answers.length} of {questions.length} questions.
          </p>
        </div>

        {/* Answer Review */}
        <div className="flex flex-col gap-4 w-full max-w-2xl">
          {questions.map((q, i) => (
            <div key={q.id} className="border rounded p-4 flex flex-col gap-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Question {i + 1}
              </p>
              <p className="text-sm font-medium">{q.question_text}</p>
              <div className="bg-muted rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Your answer</p>
                <p className="text-sm">
                  {answers[i]?.user_answer || "[No answer]"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Time taken: {answers[i]?.time_taken_seconds ?? "—"}s
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push("/session")}
            className="border rounded px-4 py-2 text-sm"
          >
            View All Sessions
          </button>
        </div>
      </main>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground font-medium">
            Question <span className="text-foreground font-semibold">{currentIndex + 1}</span> of {questions.length}
          </p>
          {/* Timer */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-semibold ${timerBg} ${timerColor}`}>
            <span>⏱</span>
            <span>{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card */}
        <div className="border rounded-lg p-6 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Panel Question
          </p>
          <p className="text-base font-medium leading-relaxed">
            {currentQuestion.question_text}
          </p>
        </div>

        {/* Answer input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Your Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={5}
            className="border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground text-right">
            {answer.length} characters
          </p>
        </div>

        {/* Submit button */}
        <button
          onClick={() => handleSubmitAnswer(false)}
          disabled={submitting}
          className="bg-primary text-primary-foreground rounded px-4 py-2.5 text-sm font-medium disabled:opacity-50 w-full"
        >
          {submitting
            ? "Saving..."
            : currentIndex + 1 >= questions.length
            ? "Submit Final Answer"
            : "Submit & Next Question →"}
        </button>

        {/* Skip button */}
        <button
          onClick={() => handleSubmitAnswer(true)}
          disabled={submitting}
          className="text-muted-foreground text-xs underline text-center"
        >
          Skip this question
        </button>

      </div>
    </main>
  );
}