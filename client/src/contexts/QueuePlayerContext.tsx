import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";


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
  isShuffled: boolean;
  /** The order in which songs are played. When shuffled, this is a random permutation; otherwise sequential. */
  playOrder: number[];
  /** Position within playOrder (not the raw queue index). */
  playOrderPosition: number;
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
  toggleShuffle: () => void;
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

/** Fisher-Yates shuffle producing a random permutation of indices 0..n-1 */
export function shuffleIndices(length: number, currentQueueIndex?: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  // Shuffle all indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // If a current index is provided, move it to position 0 so the current song stays playing
  if (currentQueueIndex !== undefined && currentQueueIndex >= 0 && currentQueueIndex < length) {
    const pos = indices.indexOf(currentQueueIndex);
    if (pos > 0) {
      [indices[0], indices[pos]] = [indices[pos], indices[0]];
    }
  }
  return indices;
}

/** Sequential order: [0, 1, 2, ..., n-1] */
function sequentialIndices(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
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
  const [isShuffled, setIsShuffled] = useState(false);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [playOrderPosition, setPlayOrderPosition] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    };
  }, []);

  // Keep volume in sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleAutoNext = useCallback(() => {
    setPlayOrderPosition((prevPos) => {
      const nextPos = prevPos + 1;
      if (nextPos < playOrder.length) {
        setCurrentIndex(playOrder[nextPos]);
        return nextPos;
      }
      // End of queue
      setIsPlaying(false);
      return prevPos;
    });
  }, [playOrder]);

  // Re-attach ended handler when playOrder changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => handleAutoNext();
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [handleAutoNext]);

  // Resolve audio source for a song
  const resolveAudioSrc = useCallback(
    async (song: QueueSong, _signal: AbortSignal): Promise<string | null> => {
      if (song.audioUrl) return song.audioUrl;
      if (song.mp3Url) return song.mp3Url;
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
      setQueue(songs);
      setCurrentIndex(startIndex);
      setQueueName(name);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);

      // Build play order based on current shuffle state
      if (isShuffled) {
        const order = shuffleIndices(songs.length, startIndex);
        setPlayOrder(order);
        setPlayOrderPosition(0); // current song is at position 0
      } else {
        const order = sequentialIndices(songs.length);
        setPlayOrder(order);
        setPlayOrderPosition(startIndex);
      }

      queueIdRef.current += 1;
    },
    [isShuffled]
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
    const nextPos = playOrderPosition + 1;
    if (nextPos < playOrder.length) {
      setPlayOrderPosition(nextPos);
      setCurrentIndex(playOrder[nextPos]);
    }
  }, [playOrderPosition, playOrder]);

  const previous = useCallback(() => {
    // If more than 3 seconds in, restart current track; otherwise go to previous in play order
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else if (playOrderPosition > 0) {
      const prevPos = playOrderPosition - 1;
      setPlayOrderPosition(prevPos);
      setCurrentIndex(playOrder[prevPos]);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, [playOrderPosition, playOrder]);

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
        // Update playOrderPosition to match
        const pos = playOrder.indexOf(index);
        if (pos >= 0) {
          setPlayOrderPosition(pos);
        }
      }
    },
    [queue.length, playOrder]
  );

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => {
      const newShuffled = !prev;
      if (newShuffled) {
        // Shuffle: create random order with current song at position 0
        const order = shuffleIndices(queue.length, currentIndex);
        setPlayOrder(order);
        setPlayOrderPosition(0);
      } else {
        // Unshuffle: restore sequential order, position at current song
        const order = sequentialIndices(queue.length);
        setPlayOrder(order);
        setPlayOrderPosition(currentIndex);
      }
      return newShuffled;
    });
  }, [queue.length, currentIndex]);

  const clearQueue = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setQueueName("");
    setIsShuffled(false);
    setPlayOrder([]);
    setPlayOrderPosition(0);
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
        isShuffled,
        playOrder,
        playOrderPosition,
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
        toggleShuffle,
        currentSong,
      }}
    >
      {children}
    </QueuePlayerContext.Provider>
  );
}
