import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VoiceNotePlayer({ url, name }: { url: string; name: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    const onError = () => { setPlaying(false); setError(true); };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => { audio.removeEventListener("loadedmetadata", onLoaded); audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnded); audio.removeEventListener("error", onError); };
  }, [url]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (audio.paused) {
      try { await audio.play(); setPlaying(true); } catch { setError(true); }
    } else { audio.pause(); setPlaying(false); }
  };

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const value = Number(event.target.value);
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return <div className="mt-2 w-full max-w-[320px] rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 shadow-sm">
    <audio ref={audioRef} preload="metadata" src={url} />
    <div className="flex items-center gap-2.5">
      <Button type="button" onClick={toggle} disabled={error} size="sm" className="h-9 w-9 shrink-0 rounded-full p-0" aria-label={playing ? "Pause voice note" : "Play voice note"}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}</Button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5"><Volume2 size={13} className="shrink-0 text-primary" /><span className="truncate text-xs font-medium">{name || "Voice note"}</span></div>
        {error ? <p className="text-[10px] text-destructive">This voice note could not be played.</p> : <input type="range" min="0" max={Math.max(duration, 0.01)} step="0.01" value={Math.min(currentTime, Math.max(duration, 0.01))} onChange={seek} className="h-1.5 w-full cursor-pointer accent-primary" aria-label="Voice note progress" />}
        {!error && <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>}
      </div>
    </div>
  </div>;
}
