"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { speakText, stopSpeaking, createSpeechRecognizer } from "@/lib/speech";
import { Suspense } from "react";

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

// ─── TYPED SESSION ────────────────────────────────────────────────────────────

function TypedSession({
  questions,
  onComplete,
}: {
  questions: Question[];
  onComplete: (answers: Answer[]) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (timedOut = false) => {
      if (submitting) return;
      setSubmitting(true);

      const currentQuestion = questions[currentIndex];
      const timeTaken = TIMER_SECONDS - timeLeft;

      const newAnswer: Answer = {
        question_id: currentQuestion.id,
        user_answer:
          timedOut && !answer.trim()
            ? "[No answer — timed out]"
            : answer.trim(),
        time_taken_seconds: timeTaken,
      };

      await supabase.from("answers").insert([{
        question_id: newAnswer.question_id,
        user_answer: newAnswer.user_answer,
        time_taken_seconds: newAnswer.time_taken_seconds,
      }]);

      const updatedAnswers = [...answers, newAnswer];

      if (currentIndex + 1 >= questions.length) {
        onComplete(updatedAnswers);
        return;
      }

      setAnswers(updatedAnswers);
      setCurrentIndex((prev) => prev + 1);
      setAnswer("");
      setTimeLeft(TIMER_SECONDS);
      setSubmitting(false);
    },
    [submitting, questions, currentIndex, timeLeft, answer, answers, onComplete]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, handleSubmit]);

  const timerColor =
    timeLeft > 30 ? "text-green-600" :
    timeLeft > 10 ? "text-yellow-500" : "text-red-500";
  const timerBg =
    timeLeft > 30 ? "bg-green-100" :
    timeLeft > 10 ? "bg-yellow-100" : "bg-red-100";
  const progress = (currentIndex / questions.length) * 100;
  const currentQuestion = questions[currentIndex];

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground font-medium">
          Question{" "}
          <span className="text-foreground font-semibold">{currentIndex + 1}</span>{" "}
          of {questions.length}
        </p>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-semibold ${timerBg} ${timerColor}`}>
          <span>⏱</span>
          <span>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
            {String(timeLeft % 60).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="border rounded-lg p-6 flex flex-col gap-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Panel Question
        </p>
        <p className="text-base font-medium leading-relaxed">
          {currentQuestion.question_text}
        </p>
      </div>

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

      <button
        onClick={() => handleSubmit(false)}
        disabled={submitting}
        className="bg-primary text-primary-foreground rounded px-4 py-2.5 text-sm font-medium disabled:opacity-50 w-full"
      >
        {submitting
          ? "Saving..."
          : currentIndex + 1 >= questions.length
          ? "Submit Final Answer"
          : "Submit & Next Question →"}
      </button>

      <button
        onClick={() => handleSubmit(true)}
        disabled={submitting}
        className="text-muted-foreground text-xs underline text-center"
      >
        Skip this question
      </button>
    </div>
  );
}

// ─── ORAL SESSION ─────────────────────────────────────────────────────────────

type OralPhase =
  | "speaking"      // TTS reading the question
  | "listening"     // mic is open, user is answering
  | "confirming"    // showing transcription for user to edit/confirm
  | "submitting";   // saving to Supabase

function OralSession({
  questions,
  onComplete,
}: {
  questions: Question[];
  onComplete: (answers: Answer[]) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<OralPhase>("speaking");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [transcript, setTranscript] = useState("");       // live transcription
  const [editableAnswer, setEditableAnswer] = useState(""); // user-editable confirmed text
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [sttError, setSttError] = useState("");
  const [timeTaken, setTimeTaken] = useState(0);

  const recognizerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const currentQuestion = questions[currentIndex];

  // ── TTS: speak question on mount and on question change
  useEffect(() => {
    setPhase("speaking");
    setTranscript("");
    setEditableAnswer("");
    setSttError("");

    speakText(currentQuestion.question_text, () => {
      // Timer starts ONLY after TTS finishes
      setPhase("listening");
      startTimeRef.current = Date.now();
      setTimeLeft(TIMER_SECONDS);
    });

    return () => {
      stopSpeaking();
      recognizerRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  // ── Countdown timer — only runs during listening phase
  useEffect(() => {
    if (phase !== "listening") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-stop mic and move to confirmation
          recognizerRef.current?.stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // ── Start STT when phase becomes "listening"
  useEffect(() => {
    if (phase !== "listening") return;

    const recognizer = createSpeechRecognizer({
      onInterimResult: (text) => setTranscript(text),
      onFinalResult: (text) => setTranscript(text),
      onEnd: () => {
        // When mic stops (silence or manual stop), move to confirmation
        setEditableAnswer(transcript);
        setPhase("confirming");
        setTimeTaken(Math.round((Date.now() - startTimeRef.current) / 1000));
        if (timerRef.current) clearInterval(timerRef.current);
      },
      onError: (err) => {
        setSttError(err);
        setPhase("confirming");
        setEditableAnswer(transcript);
      },
    });

    recognizerRef.current = recognizer;
    recognizer?.start();

    return () => recognizer?.stop();
  }, [phase]);

  async function handleConfirmAnswer() {
    setPhase("submitting");

    const newAnswer: Answer = {
      question_id: currentQuestion.id,
      user_answer: editableAnswer.trim() || "[No answer]",
      time_taken_seconds: timeTaken,
    };

    await supabase.from("answers").insert([{
      question_id: newAnswer.question_id,
      user_answer: newAnswer.user_answer,
      time_taken_seconds: newAnswer.time_taken_seconds,
    }]);

    const updatedAnswers = [...answers, newAnswer];

    if (currentIndex + 1 >= questions.length) {
      onComplete(updatedAnswers);
      return;
    }

    setAnswers(updatedAnswers);
    setCurrentIndex((prev) => prev + 1);
  }

  function handleStopListening() {
    recognizerRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeTaken(Math.round((Date.now() - startTimeRef.current) / 1000));
  }

  const timerColor =
    timeLeft > 30 ? "text-green-600" :
    timeLeft > 10 ? "text-yellow-500" : "text-red-500";
  const timerBg =
    timeLeft > 30 ? "bg-green-100" :
    timeLeft > 10 ? "bg-yellow-100" : "bg-red-100";
  const progress = (currentIndex / questions.length) * 100;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground font-medium">
          Question{" "}
          <span className="text-foreground font-semibold">{currentIndex + 1}</span>{" "}
          of {questions.length}
          <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">🎤 Oral</span>
        </p>
        {phase === "listening" && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-semibold ${timerBg} ${timerColor}`}>
            <span>⏱</span>
            <span>
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
              {String(timeLeft % 60).padStart(2, "0")}
            </span>
          </div>
        )}
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

      {/* Phase: TTS speaking */}
      {phase === "speaking" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl animate-pulse">
            🔊
          </div>
          <p className="text-sm text-muted-foreground">Reading question aloud...</p>
        </div>
      )}

      {/* Phase: Listening */}
      {phase === "listening" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl animate-pulse">
              🎤
            </div>
            <p className="text-sm font-medium">Listening... speak your answer</p>
            {sttError && <p className="text-xs text-red-500">{sttError}</p>}
          </div>

          {/* Live transcription */}
          {transcript && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Live transcription</p>
              <p className="text-sm italic text-muted-foreground">{transcript}</p>
            </div>
          )}

          <button
            onClick={handleStopListening}
            className="border border-red-300 text-red-600 rounded px-4 py-2 text-sm font-medium hover:bg-red-50 w-full"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* Phase: Confirming — editable transcription */}
      {phase === "confirming" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              We heard this — review and edit if needed:
            </label>
            <textarea
              value={editableAnswer}
              onChange={(e) => setEditableAnswer(e.target.value)}
              rows={5}
              className="border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Your transcribed answer appears here. Edit if needed."
            />
            <p className="text-xs text-muted-foreground text-right">
              {editableAnswer.length} characters
            </p>
          </div>

          <button
            onClick={handleConfirmAnswer}
            className="bg-primary text-primary-foreground rounded px-4 py-2.5 text-sm font-medium w-full"
          >
            {currentIndex + 1 >= questions.length
              ? "Confirm & Finish Session"
              : "Confirm & Next Question →"}
          </button>

          <button
            onClick={() => {
              // Re-record — go back to listening
              setTranscript("");
              setEditableAnswer("");
              setPhase("listening");
              setTimeLeft(TIMER_SECONDS);
            }}
            className="border rounded px-4 py-2 text-sm w-full"
          >
            Re-record Answer
          </button>
        </div>
      )}

      {/* Phase: Submitting */}
      {phase === "submitting" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-sm text-muted-foreground">Saving answer...</p>
        </div>
      )}
    </div>
  );
}

// ─── COMPLETION SCREEN ────────────────────────────────────────────────────────

function CompletionScreen({
  questions,
  answers,
  onDashboard,
  onSessions,
}: {
  questions: Question[];
  answers: Answer[];
  onDashboard: () => void;
  onSessions: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-4xl">🎓</div>
        <h1 className="text-2xl font-semibold">Session Complete!</h1>
        <p className="text-muted-foreground text-sm">
          You answered {answers.length} of {questions.length} questions.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-2xl">
        {questions.map((q, i) => (
          <div key={q.id} className="border rounded p-4 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Question {i + 1}
            </p>
            <p className="text-sm font-medium">{q.question_text}</p>
            <div className="bg-muted rounded p-3">
              <p className="text-xs text-muted-foreground mb-1">Your answer</p>
              <p className="text-sm">{answers[i]?.user_answer || "[No answer]"}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Time taken: {answers[i]?.time_taken_seconds ?? "—"}s
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onDashboard}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium"
        >
          Back to Dashboard
        </button>
        <button
          onClick={onSessions}
          className="border rounded px-4 py-2 text-sm"
        >
          View All Sessions
        </button>
      </div>
    </main>
  );
}

// ─── MAIN SESSION PAGE ────────────────────────────────────────────────────────

function SessionContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const sessionType = searchParams.get("session_type") ?? "typed answer";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState("");

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

  function handleComplete(finalAnswers: Answer[]) {
    setAnswers(finalAnswers);
    setSessionComplete(true);
  }

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
      <CompletionScreen
        questions={questions}
        answers={answers}
        onDashboard={() => router.push("/dashboard")}
        onSessions={() => router.push("/session")}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      {sessionType === "oral" ? (
        <OralSession questions={questions} onComplete={handleComplete} />
      ) : (
        <TypedSession questions={questions} onComplete={handleComplete} />
      )}
    </main>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </main>
    }>
      <SessionContent />
    </Suspense>
  );
}