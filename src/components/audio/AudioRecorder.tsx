import { useState, useRef, useCallback } from "react";
import { Mic, Square, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob | null) => void;
  maxDurationSeconds?: number;
  className?: string;
}

const AudioRecorder = ({
  onRecordingComplete,
  maxDurationSeconds = 60,
  className,
}: AudioRecorderProps) => {
  const [state, setState] = useState<"idle" | "recording" | "recorded">("idle");
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    urlRef.current = null;
    setPlaying(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        blobRef.current = blob;
        urlRef.current = URL.createObjectURL(blob);
        onRecordingComplete(blob);
        setState("recorded");
      };

      mediaRecorder.start(250);
      setSeconds(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            mediaRecorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      // Permission denied or not supported
    }
  }, [maxDurationSeconds, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const deleteRecording = useCallback(() => {
    cleanup();
    blobRef.current = null;
    setSeconds(0);
    setState("idle");
    onRecordingComplete(null);
  }, [cleanup, onRecordingComplete]);

  const togglePlay = useCallback(() => {
    if (!urlRef.current) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      const audio = new Audio(urlRef.current);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.play();
      setPlaying(true);
    }
  }, [playing]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {state === "idle" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={startRecording}
        >
          <Mic className="h-4 w-4 text-destructive" />
          Gravar áudio (opcional)
        </Button>
      )}

      {state === "recording" && (
        <>
          <div className="flex items-center gap-2 text-sm text-destructive animate-pulse">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            Gravando {formatTime(seconds)}
          </div>
          <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={stopRecording}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        </>
      )}

      {state === "recorded" && (
        <>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={togglePlay}>
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <span className="text-sm text-muted-foreground">{formatTime(seconds)}</span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={deleteRecording}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
};

export default AudioRecorder;
