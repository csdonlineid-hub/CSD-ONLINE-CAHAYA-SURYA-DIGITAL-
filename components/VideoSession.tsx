
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Video, Loader2, Play, Sparkles, Image as ImageIcon, CheckCircle2, AlertCircle, Monitor, Smartphone, KeyRound } from 'lucide-react';
import { AMBASSADOR_AVATAR_URL } from '../utils/constants';

interface VideoSessionProps {
  onBack: () => void;
}

// Default prompt updated with the specific visual description of CASA
const DEFAULT_PROMPT = "Video cinematic karakter AI CASA: Wanita Indonesia 23 tahun, wajah oval proporsional, kulit cerah warm undertone. Fitur wajah: Kacamata frame putih, mata coklat besar, hidung mancung. Gaya rambut: Hitam lurus sebahu, diikat ponytail dengan belahan samping kanan. Busana: Blazer Orange terang, kemeja kuning di dalam. Sedang berbicara ramah menjelaskan solusi bisnis percetakan CSD Online. Pencahayaan studio profesional, 4k, sangat realistis.";

export const VideoSession: React.FC<VideoSessionProps> = ({ onBack }) => {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isKeyError, setIsKeyError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setVideoUri(null); // Clear previous result
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleChangeKey = async () => {
    if ((window as any).aistudio) {
        try {
            await (window as any).aistudio.openSelectKey();
            setError(null);
            setIsKeyError(false);
        } catch (e) {
            console.error("Failed to open key selector", e);
        }
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setIsKeyError(false);
    setVideoUri(null);
    setIsGenerating(true);
    setStatusMessage('Memeriksa izin Kunci API...');

    try {
      // 1. Check/Request API Key (Veo requires paid tier)
      if ((window as any).aistudio && !(await (window as any).aistudio.hasSelectedApiKey())) {
          await (window as any).aistudio.openSelectKey();
          // Assume success as per instructions
      }

      // 2. Initialize Client
      // create a new instance to ensure we use the latest key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setStatusMessage('Menginisialisasi pembuatan Veo 3.1...');

      // 3. Prepare Payload
      const config: any = {
        numberOfVideos: 1,
        resolution: '720p', // Preview models often default to 720p
        aspectRatio: aspectRatio
      };

      let operation;

      // 4. Call API
      if (selectedImage) {
        const imageBase64 = await fileToBase64(selectedImage);
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          image: {
            imageBytes: imageBase64,
            mimeType: selectedImage.type
          },
          config: config
        });
      } else {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          config: config
        });
      }

      // 5. Poll for completion
      setStatusMessage('Sedang merancang video Anda... Ini mungkin memakan waktu sejenak.');
      
      const pollInterval = 5000;
      let isDone = false;
      
      while (!isDone) {
        if (operation.done) {
          isDone = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        setStatusMessage('Merender frame video...');
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      // 6. Fetch Result
      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        setStatusMessage('Mengunduh video final...');
        const downloadLink = operation.response.generatedVideos[0].video.uri;
        // Append API Key for secure fetch
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error("Failed to download video content");
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoUri(url);
      } else {
        throw new Error("No video URI returned from operation");
      }

    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Terjadi kesalahan tak terduga selama pembuatan.";
      
      // Handle 404 (Entity Not Found) - Usually Key/Project issue
      if (msg.includes("Requested entity was not found") || err.status === 404 || err.code === 404) {
          msg = "Akses ditolak. Silakan periksa apakah Kunci API Anda valid dan memiliki akses ke Veo.";
          setIsKeyError(true);
      }
      // Handle 429 (Quota Exceeded)
      else if (msg.includes("429") || msg.includes("quota") || err.status === 429 || err.code === 429) {
          msg = "Batas kuota terlampaui. Silakan periksa detail penagihan proyek Google Cloud Anda.";
      }
      
      setError(msg);
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50 max-w-6xl mx-auto p-4 md:p-6 gap-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
           <Video size={24} />
        </div>
        <div>
           <h2 className="text-2xl font-bold text-slate-900">Studio Video Veo</h2>
           <p className="text-slate-500 text-sm">Buat video AI profesional yang menampilkan CASA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* Configuration Panel */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Image Upload */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-medium text-slate-700 mb-3">Figur Karakter (CASA)</label>
                <div 
                   onClick={() => fileInputRef.current?.click()}
                   className={`relative border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer flex flex-col items-center justify-center text-center h-48 group ${
                       previewUrl ? 'border-violet-300 bg-violet-50' : 'border-slate-300 hover:border-violet-400 hover:bg-slate-50'
                   }`}
                >
                    {previewUrl ? (
                        <div className="relative w-full h-full">
                            <img src={previewUrl} alt="Reference" className="w-full h-full object-contain rounded-lg" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white font-medium text-sm">
                                Ubah Gambar
                            </div>
                        </div>
                    ) : (
                        <>
                           <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3 group-hover:scale-110 transition-transform">
                              <Upload size={24} />
                           </div>
                           <p className="text-sm text-slate-600 font-medium">Unggah Foto CASA</p>
                           <p className="text-xs text-slate-400 mt-1">Referensi PNG atau JPG</p>
                        </>
                    )}
                    <input 
                       ref={fileInputRef}
                       type="file" 
                       accept="image/*" 
                       className="hidden" 
                       onChange={handleImageSelect}
                    />
                </div>
                {!previewUrl && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                     <AlertCircle size={12} /> Unggah foto CASA untuk hasil terbaik.
                  </p>
                )}
            </div>

            {/* Config Controls */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-3">Rasio Aspek</label>
                   <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setAspectRatio('16:9')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            aspectRatio === '16:9' 
                            ? 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500' 
                            : 'border-slate-200 hover:border-violet-200 text-slate-600'
                        }`}
                      >
                         <Monitor size={18} />
                         <span className="text-sm font-medium">Lanskap</span>
                      </button>
                      <button
                        onClick={() => setAspectRatio('9:16')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            aspectRatio === '9:16' 
                            ? 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500' 
                            : 'border-slate-200 hover:border-violet-200 text-slate-600'
                        }`}
                      >
                         <Smartphone size={18} />
                         <span className="text-sm font-medium">Potret</span>
                      </button>
                   </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Prompt Video</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[160px] resize-none"
                        placeholder="Deskripsikan video yang ingin Anda buat..."
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-lg shadow-violet-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                   {isGenerating ? (
                       <>
                         <Loader2 size={20} className="animate-spin" />
                         <span>Sedang Membuat...</span>
                       </>
                   ) : (
                       <>
                         <Sparkles size={20} />
                         <span>Buat Video</span>
                       </>
                   )}
                </button>
            </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-8 flex flex-col relative">
           <style>{`
             @keyframes subtle-flow {
               0% { background-position: 0% 50%; }
               50% { background-position: 100% 50%; }
               100% { background-position: 0% 50%; }
             }
             .bg-animated-mesh {
               background: linear-gradient(-45deg, #f8fafc, #f1f5f9, #e2e8f0, #f8fafc);
               background-size: 400% 400%;
               animation: subtle-flow 15s ease infinite;
             }
           `}</style>

           <div className="flex-1 bg-animated-mesh rounded-3xl border-2 border-dashed border-slate-300/60 flex items-center justify-center overflow-hidden relative min-h-[400px] shadow-inner">
               
               {isGenerating && (
                   <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm">
                       <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-6 relative">
                           <Loader2 size={32} className="text-violet-600 animate-spin" />
                           <div className="absolute inset-0 rounded-full border-4 border-violet-200 animate-ping opacity-20"></div>
                       </div>
                       <h3 className="text-xl font-semibold text-slate-800 mb-2">Membuat Video</h3>
                       <p className="text-slate-500 max-w-md animate-pulse">{statusMessage}</p>
                   </div>
               )}

               {error && (
                   <div className="text-center p-6 max-w-md bg-white rounded-2xl shadow-xl border border-red-100 z-10">
                       <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                           <AlertCircle size={24} />
                       </div>
                       <h3 className="text-lg font-bold text-slate-900 mb-2">Pembuatan Gagal</h3>
                       <p className="text-slate-600 text-sm mb-6">{error}</p>
                       
                       {isKeyError && (
                          <button 
                            onClick={handleChangeKey}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 mx-auto"
                          >
                             <KeyRound size={16} />
                             Ubah Kunci API
                          </button>
                       )}
                   </div>
               )}

               {videoUri ? (
                   <div className="relative w-full h-full flex items-center justify-center bg-black group z-10">
                       <video 
                         src={videoUri} 
                         controls 
                         autoPlay 
                         loop 
                         className="max-h-full max-w-full shadow-2xl"
                         style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                       />
                       <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg pointer-events-none">
                           <CheckCircle2 size={12} /> Selesai
                       </div>
                   </div>
               ) : !isGenerating && !error && (
                   <div className="text-center p-6 text-slate-400 z-10">
                       <div className="w-20 h-20 bg-slate-100/50 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-slate-200">
                           <Video size={32} className="opacity-50" />
                       </div>
                       <p>Siap untuk membuat. Atur prompt dan opsi Anda untuk memulai.</p>
                   </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};
