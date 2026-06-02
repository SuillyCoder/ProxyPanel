// lib/speech.ts
// Text-to-Speech and Speech-to-Text utilities using Web Speech API

// ─── TEXT TO SPEECH ───────────────────────────────────────────────────────────

export function speakText(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined") return;
  if (!window.speechSynthesis) {
    console.warn("TTS not supported in this browser.");
    onEnd?.();
    return;
  }

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;   // slightly slower for clarity
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Pick a natural English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && v.localService
  );
  if (preferred) utterance.voice = preferred;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.(); // fallback — start timer even if TTS fails

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined") {
    window.speechSynthesis?.cancel();
  }
}

// ─── SPEECH TO TEXT ───────────────────────────────────────────────────────────

type STTCallbacks = {
  onInterimResult: (text: string) => void; // live transcription as user speaks
  onFinalResult: (text: string) => void;   // final confirmed transcription
  onEnd: () => void;                        // fired when silence detected / stopped
  onError: (error: string) => void;
};

export function createSpeechRecognizer(callbacks: STTCallbacks) {
  if (typeof window === "undefined") return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    callbacks.onError("Speech recognition is not supported in this browser. Please use Chrome.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;       // keep listening until explicitly stopped
  recognition.interimResults = true;   // show live transcription
  recognition.lang = "en-US";

  let finalTranscript = "";

  recognition.onresult = (event: any) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
        callbacks.onFinalResult(finalTranscript.trim());
      } else {
        interim += transcript;
      }
    }

    // Show live interim text to the user
    callbacks.onInterimResult(finalTranscript + interim);
  };

  recognition.onend = () => {
    callbacks.onEnd();
  };

  recognition.onerror = (event: any) => {
    if (event.error === "no-speech") {
      callbacks.onError("No speech detected. Please try again.");
    } else if (event.error === "not-allowed") {
      callbacks.onError("Microphone access denied. Please allow microphone access in your browser settings.");
    } else {
      callbacks.onError(`Speech recognition error: ${event.error}`);
    }
  };

  return recognition;
}