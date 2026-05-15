"use client";

import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Upload Manuscript</h1>
      <p className="text-muted-foreground text-sm">PDF or DOCX — Phase 3 coming soon.</p>
      <button
        onClick={() => router.push("/dashboard")}
        className="border rounded px-4 py-2 text-sm"
      >
        Back to Dashboard
      </button>
    </main>
  );
}