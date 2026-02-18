import { useState, useCallback, useRef, useEffect } from 'react';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) throw new Error('Microphone permission denied');

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });

    await recorder.prepareToRecordAsync();
    recorder.record();

    setDuration(0);
    setState('recording');

    intervalRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }, [recorder]);

  const stop = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    await recorder.stop();
    setUri(recorder.uri);
    setState('stopped');

    await setAudioModeAsync({
      allowsRecording: false,
    });
  }, [recorder]);

  const reset = useCallback(() => {
    setUri(null);
    setDuration(0);
    setState('idle');
  }, []);

  return { state, duration, uri, start, stop, reset };
}
