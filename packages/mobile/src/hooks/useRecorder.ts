import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

export type RecordingState = 'idle' | 'recording' | 'stopped';

interface RecorderResult {
  state: RecordingState;
  duration: number;
  uri: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

export function useRecorder(): RecorderResult {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const start = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Microphone permission denied');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    await recording.startAsync();
    recordingRef.current = recording;

    setDuration(0);
    setState('recording');

    intervalRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }, []);

  const stop = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!recordingRef.current) return;

    await recordingRef.current.stopAndUnloadAsync();
    const recordingUri = recordingRef.current.getURI();
    setUri(recordingUri);
    recordingRef.current = null;
    setState('stopped');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  }, []);

  const reset = useCallback(() => {
    setUri(null);
    setDuration(0);
    setState('idle');
  }, []);

  return { state, duration, uri, start, stop, reset };
}
