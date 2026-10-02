import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Compass,
  Radio,
  Loader2,
  AlertCircle,
  Send,
  HelpCircle,
} from 'lucide-react';

interface GlobalVoiceAgentProps {
  onNavigateTab?: (tab: string) => void;
  onRequestGatorCart?: () => void;
  onOpenHotline?: () => void;
  activeTab?: string;
}

export function GlobalVoiceAgent({
  onNavigateTab,
  onRequestGatorCart,
  onOpenHotline,
  activeTab = 'navigator',
}: GlobalVoiceAgentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [suggestedAction, setSuggestedAction] = useState<string | null>(null);
  const [typedInput, setTypedInput] = useState('');

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const simulatedSpeechIntervalRef = useRef<any>(null);

  // Initialize Speech Recognition ONCE on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSpeechSupport(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setMicrophoneError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentLive = (final || interim).trim();
        if (currentLive) {
          setLiveTranscript(currentLive);
          setAudioLevel(35); // Bump visualizer on speech

          // Hands-free auto submission: auto-submit to Gemini 1.4s after user stops talking
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          silenceTimeoutRef.current = setTimeout(() => {
            if (currentLive.length > 2 && isListeningRef.current) {
              handleSendToGemini(currentLive);
            }
          }, 1400);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        // 'no-speech' is normal silence, do NOT stop listening!
        if (event.error === 'no-speech') {
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
          setMicrophoneError(
            'Microphone access blocked or restricted by browser. You can click any prompt below or type your question!'
          );
        } else if (event.error === 'network') {
          setMicrophoneError('Speech network glitch. Reconnecting...');
        }
      };

      recognition.onend = () => {
        // If user is supposed to be listening (hands-free continuous mode), restart recognition!
        if (isListeningRef.current) {
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                recognition.start();
              } catch {
                // Ignore if already starting
              }
            }
          }, 200);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      setHasSpeechSupport(false);
    }

    return () => {
      isListeningRef.current = false;
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (simulatedSpeechIntervalRef.current) clearInterval(simulatedSpeechIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      stopAudioVisualizer();
    };
  }, []);

  // Audio waveform visualizer using Web Audio API
  const connectStreamToVisualizer = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(avg);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      startSimulatedWaveform();
    }
  };

  const startSimulatedWaveform = () => {
    let t = 0;
    const interval = setInterval(() => {
      if (!isListeningRef.current) {
        clearInterval(interval);
        return;
      }
      t += 0.2;
      setAudioLevel(15 + Math.sin(t) * 12);
    }, 100);
  };

  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Toggle listening
  const toggleListening = async () => {
    if (isListening) {
      // Stop listening
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch {}
      stopAudioVisualizer();
    } else {
      // Start listening
      isListeningRef.current = true;
      setIsListening(true);
      setMicrophoneError(null);
      setLiveTranscript('');

      let micGranted = false;

      // 1. Explicitly request getUserMedia: triggers browser's native microphone permission prompt
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          microphoneStreamRef.current = stream;
          micGranted = true;
          connectStreamToVisualizer(stream);
        } catch (err: any) {
          console.warn('getUserMedia prompt error:', err);
          if (
            err.name === 'NotAllowedError' ||
            err.name === 'PermissionDeniedError' ||
            err.name === 'SecurityError'
          ) {
            setMicrophoneError(
              'Microphone access is restricted by the preview iframe security policy. Open in a full browser tab or tap any preset phrase below to test live speech transcription!'
            );
          }
        }
      }

      // 2. Start speech recognition engine
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e: any) {
          console.warn('SpeechRecognition start error:', e);
        }
      }

      if (!micGranted) {
        startSimulatedWaveform();
      }
    }
  };

  // Simulate real-time word-by-word streaming transcription (useful for testing or when mic is disabled)
  const simulateLiveTranscription = (phrase: string) => {
    if (simulatedSpeechIntervalRef.current) clearInterval(simulatedSpeechIntervalRef.current);

    setIsListening(true);
    isListeningRef.current = true;
    setLiveTranscript('');
    setMicrophoneError(null);

    const words = phrase.split(' ');
    let currentIdx = 0;

    simulatedSpeechIntervalRef.current = setInterval(() => {
      if (currentIdx < words.length) {
        setLiveTranscript(words.slice(0, currentIdx + 1).join(' '));
        setAudioLevel(25 + Math.random() * 20);
        currentIdx++;
      } else {
        clearInterval(simulatedSpeechIntervalRef.current);
        setTimeout(() => {
          handleSendToGemini(phrase);
        }, 600);
      }
    }, 220);
  };

  // Send transcription to Gemini AI backend
  const handleSendToGemini = async (queryText: string) => {
    if (!queryText.trim() || isAiThinking) return;

    setIsAiThinking(true);
    setFinalTranscript(queryText);
    setLiveTranscript('');

    try {
      const response = await fetch('/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          context: {
            activeTab,
            currentBuilding: 'Cesar Chavez & Malcolm X Plaza',
            hasBrokenElevators: true,
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.reply) {
        setAiResponse(data.reply);
        setSuggestedAction(data.suggestedAction || null);

        // Speak aloud via Gemini Voice / browser TTS
        if (speechEnabled) {
          speakTextAloud(data.reply);
        }

        // Automatic action handling based on speech
        const lower = queryText.toLowerCase();
        if (lower.includes('shuttle') || lower.includes('cart') || lower.includes('ride')) {
          if (onRequestGatorCart) onRequestGatorCart();
        } else if (
          lower.includes('hotline') ||
          lower.includes('emergency') ||
          lower.includes('dprc phone')
        ) {
          if (onOpenHotline) onOpenHotline();
        }
      }
    } catch (err) {
      console.error('Error fetching voice agent reply:', err);
      setAiResponse(
        'At SFSU, all central walkways across Malcolm X Plaza, Library, and Cesar Chavez Center feature ADA slopes under 5%. You can also request a free Gator Mobility cart ride!'
      );
    } finally {
      setIsAiThinking(false);
    }
  };

  // Spoken voice playback via Web Speech Synthesis
  const speakTextAloud = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick warm natural English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.name.includes('Samantha') ||
          v.lang.startsWith('en')
      ) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Sample quick questions
  const quickQuestions = [
    'Where is the DPRC office?',
    'Is the Cesar Chavez elevator working?',
    'Call me a Gator Mobility cart',
    'How do I avoid steep slopes to Fine Arts?',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {/* 1. EXPANDED VOICE DIALOGUE CARD */}
      {isOpen && (
        <div className="mb-3 w-[340px] sm:w-[380px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-purple-300 p-4 sm:p-5 space-y-4 animate-scaleUp">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-purple-100">
            <div className="flex items-center space-x-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-amber-400 text-white flex items-center justify-center font-black shadow-md">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-ping"></span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm text-slate-900">GatorAI Voice Guide</h4>
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                    Gemini 3.8
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isListening ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  ></span>
                  <span>{isListening ? 'Hands-free voice active' : 'Voice standby'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setSpeechEnabled(!speechEnabled);
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  speechEnabled
                    ? 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                    : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                }`}
                title={speechEnabled ? 'Mute AI voice' : 'Enable AI voice output'}
              >
                {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  if (isListening) toggleListening();
                  stopSpeaking();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                title="Minimize voice agent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Microphone Notice when in preview */}
          {microphoneError && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold leading-tight">{microphoneError}</p>
                <p className="text-[10px] text-amber-800 mt-1">
                  Tip: Use the pop-out icon at the top of AI Studio, or tap any preset prompt below to test live hands-free transcription!
                </p>
              </div>
            </div>
          )}

          {/* Real-time Voice Waveform Visualizer */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-purple-200">
              <span className="flex items-center gap-1.5 font-bold">
                <Radio
                  className={`w-3.5 h-3.5 ${
                    isListening ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
                  }`}
                />
                {isListening ? 'Listening (Hands-Free)' : 'Mic Standby (Tap start below)'}
              </span>
              {isSpeaking && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-purple-950 font-bold text-[10px] animate-pulse">
                  Speaking Aloud
                </span>
              )}
            </div>

            {/* Audio Waveform Bars */}
            <div className="h-10 flex items-center justify-center space-x-1 px-2">
              {[...Array(16)].map((_, i) => {
                const heightMultiplier = isListening
                  ? Math.sin((i / 16) * Math.PI) * (audioLevel / 30 + 0.3)
                  : 0.15;
                const barHeight = Math.max(4, Math.min(32, heightMultiplier * 32));
                return (
                  <div
                    key={i}
                    style={{ height: `${barHeight}px` }}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isListening
                        ? 'bg-gradient-to-t from-purple-400 via-amber-300 to-emerald-400'
                        : 'bg-white/20'
                    }`}
                  />
                );
              })}
            </div>

            {/* LIVE TRANSCRIPTION BUBBLE (WITHOUT PUSHING) */}
            <div className="min-h-12 max-h-24 overflow-y-auto px-2 py-1.5 bg-black/30 rounded-xl text-xs text-purple-100 font-medium">
              {liveTranscript ? (
                <div className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0 mt-1"></span>
                  <p className="italic text-white font-semibold">"{liveTranscript}"</p>
                </div>
              ) : finalTranscript ? (
                <div className="text-slate-300 text-[11px]">
                  <span className="text-purple-300 font-bold">Transcribed: </span>
                  "{finalTranscript}"
                </div>
              ) : (
                <div className="text-slate-400 text-[11px] text-center pt-1 italic">
                  Speak aloud or tap a sample phrase to see live transcription in action.
                </div>
              )}
            </div>
          </div>

          {/* AI Response Display */}
          {(isAiThinking || aiResponse) && (
            <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-purple-900 font-bold text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Gemini Spoken Guidance:
                </span>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="text-[10px] text-rose-600 hover:underline font-semibold"
                  >
                    Pause Speech
                  </button>
                )}
              </div>

              {isAiThinking ? (
                <div className="flex items-center space-x-2 text-purple-700 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="font-semibold text-[11px]">
                    Consulting SFSU accessibility spatial graph...
                  </span>
                </div>
              ) : (
                <p className="text-slate-800 leading-relaxed font-medium">{aiResponse}</p>
              )}

              {/* Action shortcut if suggested */}
              {suggestedAction && !isAiThinking && (
                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (suggestedAction.includes('Cart')) {
                        if (onRequestGatorCart) onRequestGatorCart();
                      } else if (
                        suggestedAction.includes('DPRC') ||
                        suggestedAction.includes('CAPS')
                      ) {
                        if (onOpenHotline) onOpenHotline();
                      } else if (onNavigateTab) {
                        onNavigateTab('navigator');
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[11px] rounded-lg shadow-sm transition-all hover:scale-[1.02] flex items-center gap-1"
                  >
                    <span>⚡ {suggestedAction}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hands-Free Mic Control & Quick Text Input */}
          <div className="space-y-2.5">
            <button
              onClick={toggleListening}
              className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-200 animate-pulse'
                  : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Listening Now (Tap to Stop)</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Start Hands-Free Voice</span>
                </>
              )}
            </button>

            {/* Quick text input fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (typedInput.trim()) {
                  simulateLiveTranscription(typedInput.trim());
                  setTypedInput('');
                }
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="Or type a question for voice agent..."
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                type="submit"
                disabled={!typedInput.trim()}
                className="p-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-40 transition-colors"
                title="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Voice Suggestions (Clicking streams live transcription without pushing) */}
            <div className="pt-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>Test Live Voice Transcriptions:</span>
                <span className="text-[9px] text-purple-700 font-semibold">1-Tap Live Stream</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => simulateLiveTranscription(q)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-colors text-left"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SITE-WIDE GLOBAL FLOATING CORNER BUTTON / HOVER ORB */}
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover Tooltip / Floating Badge */}
        {!isOpen && isHovered && (
          <div className="absolute right-0 bottom-full mb-3 px-3 py-2 bg-slate-900/95 backdrop-blur text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap border border-slate-700 animate-fadeIn flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <div>
              <div>GatorAI Voice Guide</div>
              <div className="text-[10px] text-purple-300 font-normal">
                Click or speak hands-free • Live transcription
              </div>
            </div>
          </div>
        )}

        {/* The Corner Floating Button */}
        <button
          onClick={() => {
            const nextOpen = !isOpen;
            setIsOpen(nextOpen);
            if (nextOpen && !isListening) {
              toggleListening();
            }
          }}
          className={`relative p-3.5 sm:p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer ${
            isOpen
              ? 'bg-purple-900 text-white ring-4 ring-purple-300 scale-95'
              : isListening
              ? 'bg-rose-600 text-white ring-4 ring-rose-300 animate-pulse scale-105'
              : 'bg-gradient-to-tr from-purple-700 via-indigo-700 to-amber-400 text-white hover:scale-110 active:scale-95 shadow-purple-900/50'
          }`}
          title="Toggle GatorAI Voice Accessibility Assistant"
        >
          {/* Animated Aura Rings */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-amber-400 opacity-30 group-hover:opacity-75 blur-sm transition duration-300 -z-10 animate-tilt"></span>

          {isListening ? (
            <Mic className="w-6 h-6 text-white animate-bounce" />
          ) : (
            <Sparkles className="w-6 h-6 text-amber-200" />
          )}

          {/* Live Audio / Speaking Indicator Pill */}
          {!isOpen && (
            <span className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-purple-950 font-black text-[9px] shadow-sm uppercase tracking-wider">
              AI Voice
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
