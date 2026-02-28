import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { synthesizeAudio, createAudioUrl, revokeAudioUrl } from "@/lib/audioSynthesizer";

export type QueueSong = {
  id: number;
  title: string;
  keywords: string;
  genre: string | null;
  mood: string | null;
  tempo: number | null;
  engine: string | null;
  vocalType: string | null;
  audioUrl: string | null;
  mp3Url: string | null;
  abcNotation: string | null;
};

type QueuePlayerState = {
  queue: QueueSong[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queueName: string;
};

type QueuePlayerActions = {
  loadQueue: (songs: QueueSong[], startIndex?: number, name?: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  jumpTo: (index: number) => void;
  clearQueue: () => void;
  isInQueue: (songId: number) => boolean;
  currentSong: QueueSong | null;
};

type QueuePlayerContextType = QueuePlayerState & QueuePlayerActions;

const QueuePlayerContext = createContext<QueuePlayerContextType | null>(null);

export function useQueuePlayer() {
  const ctx = useContext(QueuePlayerContext);
  if (!ctx) {
    throw new Error("useQueuePlayer must be used within QueuePlayerProvider");
  }
  return ctx;
}

export function QueuePlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [queueName, setQueueName] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthUrlsRef = useRef<Map<number, string>>(new Map());
  const pendingSynthRef = useRef<AbortController | null>(null);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => handleAutoNext();
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
      // Clean up synthesized URLs
      synthUrlsRef.current.forEach((url) => revokeAudioUrl(url));
      synthUrlsRef.current.clear();
    };
  }, []);

  // Keep volume in sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleAutoNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIdx = prev + 1;
      if (nextIdx < queue.length) {
        // Will trigger the loadAndPlay effect
        return nextIdx;
      }
      // End of queue
      setIsPlaying(false);
      return prev;
    });
  }, [queue.length]);

  // Re-attach ended handler when queue changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => handleAutoNext();
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [handleAutoNext]);

  // Resolve audio source for a song
  const resolveAudioSrc = useCallback(
    async (song: QueueSong, signal: AbortSignal): Promise<string | null> => {
      // Suno / external URL
      if (song.audioUrl) return song.audioUrl;
      if (song.mp3Url) return song.mp3Url;

      // Already synthesized
      const cached = synthUrlsRef.current.get(song.id);
      if (cached) return cached;

      // Synthesize from ABC notation
      if (song.abcNotation) {
        const { blob } = await synthesizeAudio(song.abcNotation, song.tempo || 120);
        if (signal.aborted) return null;
        const url = createAudioUrl(blob);
        synthUrlsRef.current.set(song.id, url);
        return url;
      }

      return null;
    },
    []
  );

  // Load and play whenever currentIndex changes while queue is active
  const loadAndPlayRef = useRef<(idx: number) => Promise<void>>(undefined);
  loadAndPlayRef.current = async (idx: number) => {
    const audio = audioRef.current;
    const song = queue[idx];
    if (!audio || !song) return;

    // Cancel any pending synthesis
    pendingSynthRef.current?.abort();
    const controller = new AbortController();
    pendingSynthRef.current = controller;

    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);

    try {
      const src = await resolveAudioSrc(song, controller.signal);
      if (controller.signal.aborted) return;

      if (!src) {
        setIsLoading(false);
        setIsPlaying(false);
        return;
      }

      audio.src = src;
      audio.load();

      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener("canplay", onCanPlay);
          audio.removeEventListener("error", onErr);
          resolve();
        };
        const onErr = () => {
          audio.removeEventListener("canplay", onCanPlay);
          audio.removeEventListener("error", onErr);
          reject(new Error("Audio load failed"));
        };
        audio.addEventListener("canplay", onCanPlay);
        audio.addEventListener("error", onErr);
      });

      if (controller.signal.aborted) return;

      setIsLoading(false);
      await audio.play();
      setIsPlaying(true);
    } catch {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsPlaying(false);
      }
    }
  };

  // Trigger load-and-play when currentIndex or queue identity changes
  const queueIdRef = useRef(0);
  useEffect(() => {
    if (queue.length > 0 && currentIndex < queue.length) {
      loadAndPlayRef.current?.(currentIndex);
    }
  }, [currentIndex, queueIdRef.current]);

  const loadQueue = useCallback(
    (songs: QueueSong[], startIndex = 0, name = "") => {
      // Clean up old synth URLs
      synthUrlsRef.current.forEach((url) => revokeAudioUrl(url));
      synthUrlsRef.current.clear();

      setQueue(songs);
      setCurrentIndex(startIndex);
      setQueueName(name);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      queueIdRef.current += 1;
    },
    []
  );

  const play = useCallback(() => {
    audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, queue.length]);

  const previous = useCallback(() => {
    // If more than 3 seconds in, restart current track; otherwise go to previous
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, [currentIndex]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const jumpTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < queue.length) {
        setCurrentIndex(index);
      }
    },
    [queue.length]
  );

  const clearQueue = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    synthUrlsRef.current.forEach((url) => revokeAudioUrl(url));
    synthUrlsRef.current.clear();
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setQueueName("");
  }, []);

  const isInQueue = useCallback(
    (songId: number) => queue.some((s) => s.id === songId),
    [queue]
  );

  const currentSong = queue[currentIndex] ?? null;

  return (
    <QueuePlayerContext.Provider
      value={{
        queue,
        currentIndex,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        isMuted,
        queueName,
        loadQueue,
        play,
        pause,
        togglePlay,
        next,
        previous,
        seekTo,
        setVolume,
        toggleMute,
        jumpTo,
        clearQueue,
        isInQueue,
        currentSong,
      }}
    >
      {children}
    </QueuePlayerContext.Provider>
  );
}
