import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Trash2,
  Volume2,
  Globe,
  Radio,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface VoiceGrievanceInputProps {
  value: string;
  onChange: (newValue: string) => void;
  onAudioChange?: (audioData: { hasVoiceNote: boolean; audioNoteBase64: string }) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

// Global declaration for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceGrievanceInput: React.FC<VoiceGrievanceInputProps> = ({
  value,
  onChange,
  onAudioChange,
  placeholder = "Describe the hazard (e.g. Deep pothole causing traffic jam near main gate)...",
  className = "",
  maxLength = 1000
}) => {
  // --- Speech-to-Text State ---
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLanguage, setSpeechLanguage] = useState<'en-IN' | 'hi-IN' | 'te-IN'>('en-IN');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // --- Audio Recording State ---
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Check Web Speech API Availability on mount
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
    }
  }, []);

  // Cleanup audio object URLs & Speech Recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // --- Speech Recognition Handlers ---
  const toggleListening = () => {
    setSpeechError(null);
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
      setSpeechError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      let initialValue = value;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        // Append transcribed text directly into input box
        const spacePrefix = initialValue && !initialValue.endsWith(' ') ? ' ' : '';
        const combined = (initialValue + spacePrefix + transcript).trimStart();
        onChange(combined.slice(0, maxLength));
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError("Microphone access denied. Please check browser permissions.");
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Dictation error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize speech recognition:', err);
      setSpeechError("Could not start microphone dictation.");
      setIsListening(false);
    }
  };

  // --- Audio Recording Handlers (MediaRecorder) ---
  const startAudioRecording = async () => {
    if (isListening) {
      toggleListening(); // Stop dictation if running
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Convert blob to Base64 for persistent Firestore storage
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (onAudioChange) {
            onAudioChange({ hasVoiceNote: true, audioNoteBase64: base64data });
          }
        };

        // Stop media tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      // 30-Second Recording Timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            stopAudioRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Microphone permission denied or recording failed:', err);
      alert('Microphone access is required to record a voice note.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const deleteVoiceNote = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlayingAudio(false);
    setRecordingSeconds(0);
    if (onAudioChange) {
      onAudioChange({ hasVoiceNote: false, audioNoteBase64: '' });
    }
  };

  const togglePlayAudio = () => {
    if (!audioUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header controls: Label + Speech Language Selector + Dictation Mic */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <span>Grievance Description:</span>
        </label>

        <div className="flex items-center gap-2">
          {/* Speech Language Selector */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-medium text-slate-700">
            <Globe className="w-3 h-3 text-slate-500" />
            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value as any)}
              className="bg-transparent focus:outline-none text-[11px] font-semibold text-slate-800 cursor-pointer"
              title="Select speech recognition language"
            >
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">Hindi (हिंदी)</option>
              <option value="te-IN">Telugu (తెలుగు)</option>
            </select>
          </div>

          {/* Voice-to-Text Dictation Toggle Button */}
          {speechSupported ? (
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-red-200'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300'
              }`}
              title={isListening ? 'Click to stop speech dictation' : 'Tap to speak description'}
            >
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Stop Dictating</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-teal-700" />
                  <span>Voice Dictation</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Type details manually</span>
          )}
        </div>
      </div>

      {/* Live Dictation Waveform / Listening Banner */}
      {isListening && (
        <div className="p-2.5 bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-xl flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <div className="flex items-center gap-1.5 font-bold text-red-900">
              <span>Listening...</span>
              <span className="text-[10px] font-normal text-slate-600">
                Speak clearly near your device in {speechLanguage === 'hi-IN' ? 'Hindi' : speechLanguage === 'te-IN' ? 'Telugu' : 'English'}
              </span>
            </div>
          </div>

          {/* Animated Audio Equalizer Waveform Bars */}
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:0ms] h-full"></span>
            <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:150ms] h-2"></span>
            <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:300ms] h-3"></span>
            <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:100ms] h-1.5"></span>
          </div>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button onClick={() => setSpeechError(null)} className="text-xs font-bold text-amber-900 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={3}
          className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d7a70] focus:border-transparent transition leading-relaxed resize-none"
        />
        <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-400">
          {value.length}/{maxLength}
        </div>
      </div>

      {/* Audio Voice Note Section (MediaRecorder Pipeline) */}
      <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Record voice note trigger or recording bar */}
        {!audioBlob && !isRecordingAudio && (
          <button
            type="button"
            onClick={startAudioRecording}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-red-600" />
            <span>Attach 30s Audio Note</span>
          </button>
        )}

        {/* Live Audio Recording State Bar */}
        {isRecordingAudio && (
          <div className="flex-1 p-2 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span className="font-bold text-red-900 text-xs">Recording Voice Note...</span>
              <span className="font-mono text-xs font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:30
              </span>
            </div>

            <button
              type="button"
              onClick={stopAudioRecording}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Done</span>
            </button>
          </div>
        )}

        {/* Recorded Audio Preview Chip */}
        {audioBlob && !isRecordingAudio && (
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 p-2 rounded-xl text-xs flex-1 animate-fade-in">
            <button
              type="button"
              onClick={togglePlayAudio}
              className="w-7 h-7 bg-[#2d7a70] text-white rounded-full flex items-center justify-center hover:bg-teal-800 transition cursor-pointer shrink-0"
              title={isPlayingAudio ? 'Pause Voice Note' : 'Play Voice Note'}
            >
              {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-teal-950 font-bold">
                <Volume2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="truncate">Voice Note Attached (00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds})</span>
              </div>
              <p className="text-[10px] text-teal-700">Audio saved & ready for officer review</p>
            </div>

            <button
              type="button"
              onClick={deleteVoiceNote}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
              title="Delete voice note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
