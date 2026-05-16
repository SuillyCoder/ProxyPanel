"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ReceiptTurkishLiraIcon } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) return setError("Please select a file first.");

    // Only allow PDF and DOCX
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowedTypes.includes(file.type)) {
      return setError("Only PDF and DOCX files are allowed.");
    }

    try {
      setUploading(true);
      setError("");

      // 1. Get the current logged-in user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");
      const userId = session.user.id;

      // 2. Build a unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // 3. Upload to Supabase Storage bucket "manuscripts"
      const { error: uploadError } = await supabase.storage
        .from("manuscripts")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      // 4. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("manuscripts")
        .getPublicUrl(fileName);

      // 5. Save metadata to manuscripts table
      const { error: dbError } = await supabase
        .from("manuscripts")
        .insert([{
          user_id: userId,
          title: file.name,
          file_url: publicUrl,
        }]);
      if (dbError) throw dbError;

      // 6. After successful upload, trigger parsing
      const { data: manuscriptData, error: fetchError } = await supabase
        .from("manuscripts")
        .select("id")
        .eq("file_url", publicUrl)
        .single();

      if (fetchError || !manuscriptData){
        console.error("Could not retrieve manuscript ID after upload.");
        router.push("/dashboard");
        return;
      }

      await fetch("/api/py/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscript_id: manuscriptData.id,
          file_url: publicUrl,
          file_name: file.name,
        }),
      });

      console.log("Uploaded successfully:", publicUrl);
      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Upload Manuscript</h1>
      <p className="text-muted-foreground text-sm">Upload your manuscript right over here</p>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <input
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-sm"
      />

      <div className="flex gap-4">
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
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