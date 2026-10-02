import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  X, 
  Minimize2, 
  Send, 
  ArrowRight, 
  Compass, 
  AlertTriangle, 
  Car, 
  Phone, 
  CheckCircle2, 
  Loader2, 
  HelpCircle,
  Play,
  RotateCcw,
  Radio
} from 'lucide-react';
import { VoiceAssistResponse } from '../../server/geminiService';

interface GeminiVoiceWidgetProps {
  onNavigate: (
    targetTab: 'map' | 'report' | 'elevators' | 'support',
    actionDetails?: any,
    openModal?: 'hotline' | 'none'
  ) => void;
  currentTab: 'map' | 'report' | 'elevators' | 'support';
}

export const GeminiVoiceWidget: React.FC<GeminiVoiceWidgetProps> = ({
  onNavigate,
  currentTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioVolume, setAudioVolume] = useState<number[]>(new Array(10).fill(15));
  const [lastResult, setLastResult] = useState<VoiceAssistResponse | null>(null);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Audio recording & analysis refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Web Speech Recognition (for instant interim feedback if supported)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += text;
            } else {
              interim += text;
            }
          }

          if (interim) {
            setInterimTranscript(interim);
          }
          if (final) {
            setTranscript((prev) => (prev ? `${prev} ${final}` : final));
            setInterimTranscript('');
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition notification:', event.error);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition initialization error:', e);
      }
    }

    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
  };

  // Start real microphone capture
  const startRecording = async () => {
    setMicError(null);
    setInterimTranscript('');

    try {
      // 1. Request actual microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      mediaStreamRef.current = stream;

      // 2. Set up AudioContext for real-time live wave visualization
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Real-time animation loop for sound wave bars
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWave = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Pick 10 sample points across the frequency spectrum
        const levels = [];
        const step = Math.floor(dataArray.length / 10) || 1;
        for (let i = 0; i < 10; i++) {
          const val = dataArray[i * step] || 0;
          // Scale from 12% to 100% height
          levels.push(Math.max(12, Math.round((val / 255) * 100)));
        }
        setAudioVolume(levels);

        animationFrameRef.current = requestAnimationFrame(updateWave);
      };
      updateWave();

      // 3. Set up MediaRecorder
      audioChunksRef.current = [];
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioRecorded(audioBlob, mimeType);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // 4. Start concurrent SpeechRecognition if supported
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setIsRecording(false);
      setMicError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission blocked. Please allow mic in browser settings, or type below.'
          : 'Could not connect to microphone. You can type your request below.'
      );
    }
  };

  // Stop recording and send audio to Gemini Voice API
  const stopRecording = () => {
    setIsRecording(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAudioVolume(new Array(10).fill(15));

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Process recorded audio Blob with Gemini
  const handleAudioRecorded = async (blob: Blob, mimeType: string) => {
    if (blob.size < 100 && !transcript) return;

    setIsProcessing(true);

    try {
      // Convert Blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string) || '';

        const payload: any = {
          audioBase64: base64Data,
          mimeType,
          query: transcript.trim() || undefined,
        };

        const response = await fetch('/api/gemini/voice-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.success && data.result) {
          handleVoiceResponseReceived(data.result);
        } else {
          setIsProcessing(false);
        }
      };
    } catch (err) {
      console.error('Error sending audio to Gemini Voice API:', err);
      setIsProcessing(false);
    }
  };

  // Process text-based query directly
  const handleProcessTextQuery = async (queryText: string) => {
    const textToSubmit = queryText.trim() || transcript.trim();
    if (!textToSubmit) return;

    stopRecording();
    setIsProcessing(true);
    setTranscript(textToSubmit);

    try {
      const response = await fetch('/api/gemini/voice-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSubmit }),
      });
      const data = await response.json();

      if (data.success && data.result) {
        handleVoiceResponseReceived(data.result);
      }
    } catch (err) {
      console.error('Failed to process query:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle successful response from Gemini
  const handleVoiceResponseReceived = (result: VoiceAssistResponse) => {
    setLastResult(result);
    setIsProcessing(false);

    if (result.transcription) {
      setTranscript(result.transcription);
      setInterimTranscript('');
    }

    // Play Gemini's Voice Audio
    if (isVoiceOutputEnabled) {
      if (result.audioBase64) {
        playGeminiVoiceAudio(result.audioBase64);
      } else if (result.spokenResponse) {
        speakBrowserTTS(result.spokenResponse);
      }
    }

    // Automatically navigate to correct section after short moment
    setTimeout(() => {
      onNavigate(result.targetTab, result.actionDetails, result.openModal);
    }, 700);
  };

  // Play audio WAV generated by Gemini 3.8 Flash TTS
  const playGeminiVoiceAudio = (base64Wav: string) => {
    try {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }

      const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
      activeAudioPlayerRef.current = audio;

      audio.onplay = () => setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => {
        setIsPlayingAudio(false);
        if (lastResult?.spokenResponse) {
          speakBrowserTTS(lastResult.spokenResponse);
        }
      };

      audio.play().catch((err) => {
        console.warn('Autoplay prevented:', err);
        setIsPlayingAudio(false);
      });
    } catch (e) {
      console.warn('Error playing Gemini voice audio:', e);
      if (lastResult?.spokenResponse) {
        speakBrowserTTS(lastResult.spokenResponse);
      }
    }
  };

  // Fallback Web Speech Synthesis
  const speakBrowserTTS = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setTranscript(prompt);
    handleProcessTextQuery(prompt);
  };

  const getTabIcon = (tab?: string) => {
    switch (tab) {
      case 'map':
        return <Compass className="w-4 h-4 text-purple-600" />;
      case 'elevators':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'report':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'support':
        return <Car className="w-4 h-4 text-purple-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <>
      {/* 1. COLLAPSED FLOATING CORNER WIDGET (Tidio / Chatbot style) */}
      {!isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-40 flex items-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Peeking Prompt Balloon on Hover */}
          <div 
            onClick={() => {
              setIsOpen(true);
              startRecording();
            }}
            className={`mr-3 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-purple-200 shadow-xl text-slate-800 text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer hover:border-purple-400 group max-w-xs ${
              isHovered ? 'opacity-100 translate-x-0 scale-100' : 'opacity-90 translate-x-1 sm:opacity-100'
            }`}
          >
            <div className="flex items-center gap-1.5 text-purple-800 font-bold text-[11px] uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Gemini Voice</span>
            </div>
            <p className="text-slate-800 leading-snug font-semibold">
              "What's your current accessibility need. How can we help?"
            </p>
          </div>

          {/* Glowing Circular Launcher Icon */}
          <button
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => {
                startRecording();
              }, 200);
            }}
            className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-purple-800 via-indigo-700 to-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/40 group focus:outline-none focus:ring-4 focus:ring-purple-300"
            aria-label="Open Gemini Voice Accessibility Assistant"
          >
            {/* Pulsing halo */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-amber-400 opacity-40 blur-sm group-hover:opacity-75 transition duration-500" />
            
            <div className="relative flex items-center justify-center">
              <Mic className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1" />
            </div>
          </button>
        </div>
      )}

      {/* 2. EXPANDED VERTICAL RECTANGULAR DASHBOARD */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-88 sm:w-96 max-h-[620px] h-[590px] rounded-3xl shadow-2xl border border-purple-200/80 bg-white flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-900 text-white p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600/40 border border-purple-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-white tracking-wide">Gemini Voice</h3>
                </div>
                <p className="text-[11px] text-purple-200">SFSU Accessibility Navigator</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Voice Out Toggle */}
              <button
                onClick={() => {
                  setIsVoiceOutputEnabled(!isVoiceOutputEnabled);
                  if (activeAudioPlayerRef.current) activeAudioPlayerRef.current.pause();
                  window.speechSynthesis?.cancel();
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isVoiceOutputEnabled
                    ? 'text-purple-200 hover:text-white hover:bg-white/10'
                    : 'text-purple-400 hover:text-purple-200 hover:bg-white/10'
                }`}
                title={isVoiceOutputEnabled ? 'Voice response enabled' : 'Voice response muted'}
              >
                {isVoiceOutputEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  stopRecording();
                  if (activeAudioPlayerRef.current) activeAudioPlayerRef.current.pause();
                  window.speechSynthesis?.cancel();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close Gemini Voice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Core Question Prompt */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50/60 border border-purple-100 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-purple-950 leading-snug">
                      What's your current accessibility need. How can we help?
                    </h4>
                    <p className="text-[11px] text-purple-800/80 mt-1">
                      Tap the mic to speak naturally. Gemini listens, transcribes, and takes you to the right campus tool.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mic Permission Warning */}
              {micError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{micError}</p>
                  </div>
                </div>
              )}

              {/* Real-time Transcription & Soundwave Visualizer Display */}
              <div className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                isRecording
                  ? 'border-purple-500 bg-purple-50/70 shadow-md ring-2 ring-purple-300'
                  : 'border-slate-200 bg-slate-50/80'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    {isRecording
                      ? 'Listening to your voice...'
                      : isProcessing
                      ? 'Gemini Voice API processing...'
                      : 'Transcribed question:'}
                  </span>
                  {isRecording ? (
                    <span className="text-[10px] text-rose-600 font-mono font-bold">
                      Recording audio
                    </span>
                  ) : isPlayingAudio ? (
                    <span className="text-[10px] text-purple-700 font-mono font-bold flex items-center gap-1">
                      <Volume2 className="w-3 h-3 " />
                      Gemini Speaking
                    </span>
                  ) : null}
                </div>

                {/* Real-Time Responsive Soundwave Frequency Bars */}
                {isRecording && (
                  <div className="flex items-center justify-center gap-1.5 py-2 my-1.5 bg-purple-900/5 rounded-xl border border-purple-100">
                    {audioVolume.map((vol, index) => (
                      <span
                        key={index}
                        className="w-1.5 bg-gradient-to-t from-purple-700 to-indigo-500 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(8, vol * 0.45)}px` }}
                      />
                    ))}
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-800 font-medium min-h-[44px] leading-relaxed break-words">
                  {transcript || interimTranscript ? (
                    <span>
                      {transcript}
                      <span className="text-purple-600 italic"> {interimTranscript}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">
                      {isRecording
                        ? 'Speak now... e.g. "I need an electric golf cart pickup at Lot 20"'
                        : 'Tap the mic below and speak your accessibility need, or type below...'}
                    </span>
                  )}
                </p>
              </div>

              {/* AI Result & Navigation Banner */}
              {lastResult && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-purple-50 to-indigo-50 border border-emerald-200 shadow-sm space-y-2 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{lastResult.uiFeedback}</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Routed
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-700 leading-snug">
                      "{lastResult.spokenResponse}"
                    </p>
                    {lastResult.audioBase64 && (
                      <button
                        onClick={() => playGeminiVoiceAudio(lastResult.audioBase64!)}
                        className="p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 shrink-0 transition-colors"
                        title="Replay Gemini voice"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onNavigate(lastResult.targetTab, lastResult.actionDetails, lastResult.openModal);
                      setIsOpen(false);
                    }}
                    className="w-full mt-1.5 py-1.5 px-3 bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
                  >
                    {getTabIcon(lastResult.targetTab)}
                    <span>
                      {lastResult.actionDetails?.buildingName
                        ? `View Step-Free Route to ${lastResult.actionDetails.buildingName}`
                        : `Open ${lastResult.targetTab.toUpperCase()} Section`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick Sample Queries */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Common Accessibility Needs
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleQuickPrompt("I'm having trouble with the staircase to student services")}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 border border-slate-200 transition-colors"
                  >
                    🚶 Avoid stairs to Student Services
                  </button>
                  <button
                    onClick={() => handleQuickPrompt('I need an electric golf cart pickup at Lot 20')}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 border border-slate-200 transition-colors"
                  >
                    ⚡ Request Gator Cart ride
                  </button>
                  <button
                    onClick={() => handleQuickPrompt('Is the elevator in Cesar Chavez student center working?')}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 border border-slate-200 transition-colors"
                  >
                    🛗 Check Cesar Chavez elevators
                  </button>
                  <button
                    onClick={() => handleQuickPrompt('Find a step-free route from Muni station to Fine Arts')}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 border border-slate-200 transition-colors"
                  >
                    🗺️ Step-free path to Fine Arts
                  </button>
                  <button
                    onClick={() => handleQuickPrompt('Report a broken blue power door button at Library')}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 border border-slate-200 transition-colors"
                  >
                    ⚠️ Report broken door opener
                  </button>
                  <button
                    onClick={() => handleQuickPrompt('I need urgent mental health counseling or crisis hotline')}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 border border-slate-200 transition-colors"
                  >
                    💜 CAPS 24/7 crisis support
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Controls: Mic Button & Text Box */}
            <div className="pt-2 border-t border-slate-100 space-y-2 shrink-0">
              {/* Big Prominent Mic Interaction */}
              <div className="flex items-center justify-center py-1">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`relative p-4 rounded-full transition-all duration-300 shadow-xl flex items-center justify-center ${
                    isRecording
                      ? 'bg-rose-600 text-white ring-8 ring-rose-200 scale-110 shadow-rose-200'
                      : isProcessing
                      ? 'bg-purple-400 text-white cursor-wait'
                      : 'bg-purple-700 hover:bg-purple-800 text-white hover:scale-105'
                  }`}
                  aria-label={isRecording ? 'Stop speaking to Gemini Voice' : 'Tap to speak into Gemini Voice'}
                >
                  {isProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                  {isRecording && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                    </span>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-center text-slate-600 font-semibold">
                {isProcessing
                  ? 'Transcribing and routing with Gemini Voice API...'
                  : isRecording
                  ? 'Tap mic again when done speaking'
                  : 'Tap mic to speak into Gemini Voice'}
              </p>

              {/* Text Input Fallback */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (transcript.trim()) {
                    handleProcessTextQuery(transcript);
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Or type your question here..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50"
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={!transcript.trim() || isProcessing}
                  className="p-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-all"
                  aria-label="Send query"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
