
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, PhoneOff, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { ConnectionState } from '../types';
import { createAudioBlob, base64Decode, decodeAudioData } from '../utils/audioUtils';
import { AMBASSADOR_AVATAR_URL } from '../utils/constants';

interface LiveSessionProps {
  onBack: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export const LiveSession: React.FC<LiveSessionProps> = ({ onBack }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Audio Contexts & Analyzers
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // Stream & Processing
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback state
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isResponseActive = useRef<boolean>(false);
  
  // API Session & Reconnection Logic
  const sessionRef = useRef<Promise<any> | null>(null);
  const retryCountRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalDisconnect = useRef<boolean>(false);

  // Helper untuk memutar nada feedback (bip/klik)
  const playFeedbackTone = (type: 'start' | 'end', startTime: number) => {
    const ctx = outputAudioContextRef.current;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const freq = type === 'start' ? 800 : 400; // Nada tinggi untuk mulai, rendah untuk selesai
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Amplop volume untuk efek "klik" pendek
      gain.gain.setValueAtTime(0.05, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    } catch (e) {
      console.error("Error playing tone", e);
    }
  };

  const cleanupAudioResources = () => {
    stopAllAudioPlayback();
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    // Close session if exists
    if (sessionRef.current) {
        sessionRef.current.then(s => {
            try { s.close(); } catch(e) { /* ignore */ }
        });
        sessionRef.current = null;
    }
  };

  const handleConnectionLoss = () => {
    if (isIntentionalDisconnect.current) return;

    cleanupAudioResources();

    if (retryCountRef.current < MAX_RETRIES) {
      const nextRetry = retryCountRef.current + 1;
      retryCountRef.current = nextRetry;
      
      setConnectionState(ConnectionState.RECONNECTING);
      console.log(`Connection lost. Retrying... (${nextRetry}/${MAX_RETRIES})`);

      reconnectTimeoutRef.current = setTimeout(() => {
        startSession(true);
      }, RETRY_DELAY_MS);
    } else {
      setConnectionState(ConnectionState.ERROR);
      setErrorMsg("Koneksi internet tidak stabil. Gagal menghubungkan kembali setelah beberapa percobaan.");
    }
  };

  const startSession = async (isRetry = false) => {
    setErrorMsg(null);
    if (!isRetry) {
        setConnectionState(ConnectionState.CONNECTING);
        retryCountRef.current = 0;
    }
    isIntentionalDisconnect.current = false;

    try {
      // Inisialisasi Audio Context baru setiap sesi
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 256; 
      
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 256;

      outputAnalyserRef.current.connect(outputAudioContextRef.current.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Prepare Time Context
      const now = new Date();
      const formattedDate = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const formattedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are CASA, the CSD ONLINE Artificial Smart Assistant. 
          Current Context: Today is ${formattedDate}, and the current time is ${formattedTime}.
          You are a helpful, professional, and friendly representative for Cahaya Surya Digital. Your goal is to assist SME printing business owners in Indonesia with technical and business solutions. Keep responses concise and conversational. Always speak in Indonesian.`,
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            retryCountRef.current = 0; // Reset retries on success
            setupAudioInputProcessing(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
             const interrupted = message.serverContent?.interrupted;
             if (interrupted) {
               stopAllAudioPlayback();
               nextStartTimeRef.current = 0;
               isResponseActive.current = false;
               return; 
             }

             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             
             if (base64Audio && outputAudioContextRef.current && outputAnalyserRef.current) {
                const ctx = outputAudioContextRef.current;
                if (ctx.state === 'suspended') await ctx.resume();

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                if (!isResponseActive.current) {
                  isResponseActive.current = true;
                  playFeedbackTone('start', nextStartTimeRef.current);
                  nextStartTimeRef.current += 0.15;
                }
                
                const audioBuffer = await decodeAudioData(
                  base64Decode(base64Audio),
                  ctx,
                  24000
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAnalyserRef.current);
                
                source.addEventListener('ended', () => {
                  audioSourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
             }

             if (message.serverContent?.turnComplete && isResponseActive.current) {
                if (outputAudioContextRef.current) {
                   playFeedbackTone('end', nextStartTimeRef.current);
                   nextStartTimeRef.current += 0.15;
                }
                isResponseActive.current = false;
             }
          },
          onclose: () => {
             handleConnectionLoss();
          },
          onerror: (err) => {
            console.error('Session error:', err);
            handleConnectionLoss();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to start session:", err);
      // Jika error terjadi di awal (misal mic blocked), jangan retry loop
      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
        setConnectionState(ConnectionState.ERROR);
        setErrorMsg("Akses mikrofon ditolak atau tidak ditemukan.");
      } else {
        handleConnectionLoss();
      }
    }
  };

  const setupAudioInputProcessing = (stream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputAudioContextRef.current || !inputAnalyserRef.current) return;
    
    const ctx = inputAudioContextRef.current;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    
    sourceRef.current = source;
    processorRef.current = processor;

    source.connect(inputAnalyserRef.current);
    inputAnalyserRef.current.connect(processor);
    processor.connect(ctx.destination);

    processor.onaudioprocess = (e) => {
      if (isMicMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const blob = createAudioBlob(inputData);
      
      // Gunakan catch untuk menghindari unhandled promise rejection saat koneksi putus
      sessionPromise.then(session => {
        try {
            session.sendRealtimeInput({ media: blob });
        } catch (e) {
            // Ignore send errors during reconnection
        }
      }).catch(() => {});
    };
  };

  const stopAllAudioPlayback = () => {
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioSourcesRef.current.clear();
  };

  const disconnect = () => {
    isIntentionalDisconnect.current = true;
    if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
    }
    cleanupAudioResources();
    setConnectionState(ConnectionState.DISCONNECTED);
    isResponseActive.current = false;
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (connectionState === ConnectionState.DISCONNECTED && !errorMsg) {
       startSession();
    }
  }, []);

  const toggleMute = () => {
    setIsMicMuted(!isMicMuted);
  };

  // Helper untuk menentukan warna status UI
  const getStatusColor = () => {
      if (connectionState === ConnectionState.CONNECTED) return 'bg-blue-100 text-blue-700';
      if (connectionState === ConnectionState.ERROR) return 'bg-red-100 text-red-700';
      if (connectionState === ConnectionState.RECONNECTING) return 'bg-amber-100 text-amber-700';
      return 'bg-slate-200 text-slate-600';
  };

  const getStatusDotColor = () => {
      if (connectionState === ConnectionState.CONNECTED) return 'bg-blue-600 animate-pulse';
      if (connectionState === ConnectionState.ERROR) return 'bg-red-600';
      if (connectionState === ConnectionState.RECONNECTING) return 'bg-amber-500 animate-bounce';
      return 'bg-slate-400';
  };

  const getStatusText = () => {
      if (connectionState === ConnectionState.CONNECTED) return 'Langsung dengan CASA';
      if (connectionState === ConnectionState.CONNECTING) return 'Menghubungkan ke CASA...';
      if (connectionState === ConnectionState.RECONNECTING) return 'Mencoba menghubungkan kembali...';
      if (connectionState === ConnectionState.ERROR) return 'Kesalahan Koneksi';
      return 'Terputus';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-slate-100 z-0" />
      
      {/* CSS untuk Sonar Effect */}
      <style>{`
        @keyframes sonar-wave {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.8); }
        }
        .animate-sonar {
          animation: sonar-wave 2s infinite ease-out;
        }
        .delay-500 { animation-delay: 0.5s; }
        .delay-1000 { animation-delay: 1s; }
        @keyframes progress-indeterminate {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 70%; margin-left: 30%; }
            100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
            animation: progress-indeterminate 1.5s infinite ease-in-out;
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 p-6 space-y-8">
        <div className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 flex items-center gap-2 ${getStatusColor()}`}>
          <div className={`w-2 h-2 rounded-full ${getStatusDotColor()}`} />
          {getStatusText()}
        </div>

        <div className="relative w-full max-w-2xl aspect-video bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 ring-4 ring-slate-50/50">
           {connectionState === ConnectionState.ERROR ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 p-8 text-center animate-fade-in">
               <AlertCircle size={48} className="mb-4" />
               <p className="mb-6 max-w-xs mx-auto">{errorMsg}</p>
               <button 
                onClick={() => startSession(false)}
                className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center gap-2"
               >
                 <RefreshCw size={16} /> Coba Lagi Manual
               </button>
             </div>
           ) : connectionState === ConnectionState.RECONNECTING ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50 text-amber-600 animate-fade-in">
                 <WifiOff size={48} className="mb-4 animate-pulse" />
                 <p className="font-medium">Sinyal terputus</p>
                 <p className="text-sm text-amber-500 mt-1">Menghubungkan kembali secara otomatis...</p>
                 <div className="w-48 h-1 bg-amber-100 rounded-full mt-4 overflow-hidden">
                     <div className="h-full bg-amber-500 animate-progress-indeterminate"></div>
                 </div>
             </div>
           ) : (
            <>
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full absolute opacity-40">
                      <AudioVisualizer 
                        analyser={inputAnalyserRef.current} 
                        isListening={!isMicMuted && connectionState === ConnectionState.CONNECTED}
                        color="#94a3b8" 
                      />
                  </div>
                   <div className="w-full h-full absolute">
                      <AudioVisualizer 
                        analyser={outputAnalyserRef.current} 
                        isListening={connectionState === ConnectionState.CONNECTED}
                        color="#2563eb" 
                      />
                  </div>
               </div>
               
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="relative flex items-center justify-center">
                    {/* Sonar / Ripple Effects */}
                    {connectionState === ConnectionState.CONNECTED && (
                        <>
                            <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 animate-sonar"></div>
                            <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 animate-sonar delay-500"></div>
                            <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 animate-sonar delay-1000"></div>
                        </>
                    )}

                    {/* Aura Belakang */}
                    <div className={`absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 transition-all duration-500 ${connectionState === ConnectionState.CONNECTED ? 'scale-150 opacity-40' : 'scale-100'}`} />
                    
                    {/* Avatar Image - Updated for Logo */}
                    <div className="relative z-10 p-1 bg-white/30 backdrop-blur-sm rounded-full">
                        <img 
                        src={AMBASSADOR_AVATAR_URL}
                        alt="CASA"
                        className="w-32 h-32 rounded-full object-contain p-4 bg-white border-4 border-white shadow-lg relative z-20"
                        />
                    </div>
                    
                    {connectionState === ConnectionState.CONNECTING && (
                         <div className="absolute inset-0 flex items-center justify-center z-30">
                            <div className="w-36 h-36 border-4 border-blue-500/50 border-t-blue-600 rounded-full animate-spin" />
                         </div>
                    )}
                 </div>
               </div>
            </>
           )}
        </div>

        <div className="flex items-center gap-6 mt-8">
           <button
             onClick={toggleMute}
             disabled={connectionState !== ConnectionState.CONNECTED}
             className={`p-4 rounded-full shadow-lg transition-all duration-200 ${
               isMicMuted 
                 ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                 : 'bg-white text-slate-700 hover:bg-slate-50 hover:scale-105'
             } disabled:opacity-50 disabled:cursor-not-allowed`}
           >
             {isMicMuted ? <MicOff size={28} /> : <Mic size={28} />}
           </button>

           <button
             onClick={disconnect}
             className="p-4 rounded-full bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600 hover:scale-105 transition-all duration-200"
             title="End Session"
           >
             <PhoneOff size={28} />
           </button>
        </div>
        
        <p className="text-slate-400 text-sm max-w-md text-center">
          {connectionState === ConnectionState.RECONNECTING 
            ? 'Harap tunggu, memperbaiki koneksi...' 
            : isMicMuted 
              ? 'Mikrofon dimatikan.' 
              : 'CASA mendengarkan... Bicaralah secara alami.'}
        </p>

      </div>
    </div>
  );
};