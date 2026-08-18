import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const WAVEFORM = [8, 13, 18, 11, 23, 16, 10, 20, 14, 25, 17, 9, 21, 15, 24, 12, 19, 10, 22, 16, 8, 18, 13, 24, 15, 10, 20, 13];

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VoiceNotePlayer({ url, name, tone = "light" }: { url: string; name?: string; tone?: "light" | "dark" }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const dark = tone === "dark";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setError(false);
    audio.load();
    const onLoaded = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onDurationChange = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    const onError = () => { setPlaying(false); setError(true); };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [url]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (audio.paused) {
      try { await audio.play(); setPlaying(true); } catch { setError(true); }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const value = Number(event.target.value);
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className={`mt-2 w-full max-w-[320px] rounded-2xl border px-3 py-2.5 ${dark ? "border-white/15 bg-black/10" : "border-border/70 bg-background/70"}`}>
      <audio ref={audioRef} preload="metadata" src={url} className="hidden" />
      <div className="flex items-center gap-2.5">
        <Button type="button" onClick={toggle} disabled={error} size="sm" className={`h-9 w-9 shrink-0 rounded-full p-0 ${dark ? "bg-white text-primary hover:bg-white/90" : ""}`} aria-label={playing ? "Pause voice note" : "Play voice note"}>
          {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5"><Volume2 size={13} className="shrink-0 opacity-75" /><span className="truncate text-xs font-medium">{name || "Voice note"}</span></div>
          {error ? <p className="text-[10px] text-destructive">This voice note could not be played.</p> : <div className="relative h-7 overflow-hidden rounded-md" aria-label="Voice note waveform">
            <div className="absolute inset-0 flex items-center justify-between gap-[2px] px-0.5 opacity-45">{WAVEFORM.map((height, index) => <span key={index} className={`w-1 rounded-full ${dark ? "bg-white" : "bg-primary"}`} style={{ height: `${height}px` }} />)}</div>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-[2px] overflow-hidden px-0.5" style={{ width: `${Math.max(progress * 100, progress > 0 ? 1 : 0)}%` }}>{WAVEFORM.map((height, index) => <span key={index} className={`w-1 shrink-0 rounded-full ${dark ? "bg-white" : "bg-primary"}`} style={{ height: `${height}px` }} />)}</div>
            <input type="range" min="0" max={Math.max(duration, 0.01)} step="0.01" value={Math.min(currentTime, Math.max(duration, 0.01))} onChange={seek} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Voice note progress" />
          </div>}
          {!error && <div className="mt-1 flex justify-between text-[10px] opacity-70"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>}
        </div>
      </div>
    </div>
  );
}
