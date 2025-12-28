import React, { useState } from 'react';
import { MessageSquare, Mic, Info, ArrowRight, Share2, Calendar, ExternalLink, Play, MapPin, Phone } from 'lucide-react';
import { LiveSession } from './components/LiveSession';
import { ChatSession } from './components/ChatSession';
import { AMBASSADOR_AVATAR_URL } from './utils/constants';

enum AppMode {
  HOME,
  LIVE,
  CHAT
}

// Data Dummy Berita
const NEWS_UPDATES = [
  {
    id: 1,
    title: "Tren Digital Printing 2025",
    excerpt: "Mengungkap teknologi tinta UV terbaru yang lebih ramah lingkungan dan hemat biaya untuk UKM.",
    date: "14 Des 2024",
    image: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?auto=format&fit=crop&w=800&q=80",
    url: "https://csdonline.co.id/news/trend-2025" 
  },
  {
    id: 2,
    title: "Tips Perawatan Printhead",
    excerpt: "Panduan lengkap cara memperpanjang umur printhead mesin large format Anda agar tetap presisi.",
    date: "10 Des 2024",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
    url: "https://csdonline.co.id/news/maintenance-tips"
  },
  {
    id: 3,
    title: "Promo Akhir Tahun CSD",
    excerpt: "Dapatkan penawaran spesial untuk pembelian mesin dan bahan baku selama bulan Desember.",
    date: "01 Des 2024",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=800&q=80",
    url: "https://csdonline.co.id/promo"
  }
];

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);

  const handleShare = async (newsItem: typeof NEWS_UPDATES[0]) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: newsItem.title,
          text: newsItem.excerpt,
          url: newsItem.url,
        });
      } else {
        // Fallback untuk browser desktop yang tidak mendukung Web Share API
        await navigator.clipboard.writeText(`${newsItem.title}\n${newsItem.url}`);
        alert("Tautan berita berhasil disalin ke papan klip!");
      }
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE:
        return <LiveSession onBack={() => setMode(AppMode.HOME)} />;
      case AppMode.CHAT:
        return <ChatSession onBack={() => setMode(AppMode.HOME)} />;
      case AppMode.HOME:
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12 animate-fade-in space-y-16">
            
            {/* Style untuk animasi custom */}
            <style>{`
              @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-15px); }
                100% { transform: translateY(0px); }
              }
              .animate-float {
                animation: float 6s ease-in-out infinite;
              }
              @keyframes spin-slow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-spin-slow {
                animation: spin-slow 12s linear infinite;
              }
            `}</style>

            {/* Hero Section dengan Avatar Baru */}
            <div className="text-center space-y-6 max-w-2xl flex flex-col items-center">
              
              <div className="relative group animate-float py-4">
                {/* Glow Effect / Aura Belakang */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-pulse"></div>
                
                {/* Cincin Berputar */}
                <div className="absolute -inset-1 border border-blue-200/50 rounded-full w-full h-full animate-spin-slow" style={{ borderStyle: 'dashed' }}></div>
                <div className="absolute -inset-3 border border-slate-200/30 rounded-full w-full h-full" style={{ animation: 'spin-slow 18s linear infinite reverse' }}></div>

                {/* Avatar Image Container - Updated for Logo */}
                <div className="relative p-1 bg-white rounded-full shadow-2xl">
                    <img 
                      src={AMBASSADOR_AVATAR_URL} 
                      alt="CASA Avatar" 
                      className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-contain p-2 bg-white border-4 border-slate-50 shadow-inner"
                    />
                </div>
                
                {/* Status Indicator */}
                <div className="absolute bottom-4 right-2 flex items-center justify-center">
                   <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                   <div className="relative w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-md"></div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                  CASA - CSD ONLINE
                </h1>
                <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  Artificial Smart Assistant
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
                  Selamat datang. Saya CASA, Asisten cerdas CSD Online siap membantu anda untuk mendukung bisnis Digital Printing anda dengan solusi inovatif
                </p>
              </div>
            </div>

            {/* Main Action Buttons - English Version */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
              <button
                onClick={() => setMode(AppMode.LIVE)}
                className="group relative flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-2xl border-2 border-slate-100 hover:border-blue-500 transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center w-full h-full">
                  
                  {/* Icon with Bounce Animation */}
                  <div className="p-5 bg-blue-100 text-blue-600 rounded-full mb-6 shadow-md animate-bounce">
                    <Mic size={36} />
                  </div>
                  
                  {/* English Text, Larger & Bolder */}
                  <h3 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-wider">
                    LIVE VOICE
                  </h3>
                  <p className="text-base text-slate-600 text-center mb-6 font-medium leading-relaxed">
                    Talk to CASA in real-time.
                  </p>
                  
                  <div className="flex items-center text-blue-600 font-extrabold text-sm group-hover:gap-3 transition-all mt-auto uppercase tracking-wide">
                    Start Session <ArrowRight size={18} className="ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.CHAT)}
                className="group relative flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-2xl border-2 border-slate-100 hover:border-emerald-500 transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
              >
                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center w-full h-full">
                  
                  {/* Icon with Bounce Animation (Delayed) */}
                  <div className="p-5 bg-emerald-100 text-emerald-600 rounded-full mb-6 shadow-md animate-bounce delay-100">
                    <MessageSquare size={36} />
                  </div>
                  
                  {/* English Text, Larger & Bolder */}
                  <h3 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-wider">
                    TEXT CHAT
                  </h3>
                  <p className="text-base text-slate-600 text-center mb-6 font-medium leading-relaxed">
                    Message CASA for instant support.
                  </p>
                  
                  <div className="flex items-center text-emerald-600 font-extrabold text-sm group-hover:gap-3 transition-all mt-auto uppercase tracking-wide">
                    Start Chat <ArrowRight size={18} className="ml-1" />
                  </div>
                </div>
              </button>
            </div>

            {/* Featured Video Section - Fixed Display */}
            <div className="w-full max-w-5xl">
               <div className="flex items-center gap-2 mb-6">
                 <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                   <Play size={20} fill="currentColor" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">CASA, Asisten Cerdas CSD Online</h3>
               </div>
               <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 group cursor-pointer">
                  {/* Placeholder Video Player untuk menghindari error iframe */}
                  <div className="absolute inset-0 bg-slate-900">
                      <img 
                        src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1932&auto=format&fit=crop" 
                        alt="CASA AI Visualization" 
                        className="w-full h-full object-cover opacity-60 transition-opacity duration-500 group-hover:opacity-40"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                  </div>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                     <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 ring-4 ring-red-500/30 mb-6">
                        <Play size={36} fill="white" className="text-white ml-2" />
                     </div>
                     <div className="max-w-xl space-y-2">
                        <h4 className="text-2xl font-bold text-white drop-shadow-md">Video Profil CASA</h4>
                        <p className="text-slate-200 text-lg drop-shadow-sm font-medium">
                           Saksikan bagaimana teknologi AI membantu bisnis digital printing Anda.
                        </p>
                         <p className="text-sm text-slate-400 mt-2 border border-slate-600 rounded-full px-3 py-1 inline-block bg-slate-900/50 backdrop-blur-sm">
                            Segera Hadir
                         </p>
                     </div>
                  </div>
               </div>
            </div>

            {/* News Section */}
            <div className="w-full max-w-5xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Berita & Wawasan Terkini</h3>
                <button className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
                   Lihat Semua <ExternalLink size={14} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {NEWS_UPDATES.map((news) => (
                  <div key={news.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={news.image} 
                        alt={news.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-sm">
                         <Calendar size={12} /> {news.date}
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h4 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 leading-tight">
                        {news.title}
                      </h4>
                      <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">
                        {news.excerpt}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                         <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                            Baca Selengkapnya
                         </button>
                         <button 
                           onClick={() => handleShare(news)}
                           className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                           title="Bagikan Berita"
                         >
                            <Share2 size={18} />
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Section */}
            <div className="w-full max-w-5xl pt-10 pb-8 border-t border-slate-200 mt-8 flex flex-col items-center justify-between gap-6">
                
                <div className="flex flex-col md:flex-row flex-wrap justify-center items-center gap-6 md:gap-8 w-full">
                    {/* Location Link */}
                    <a 
                      href="https://goo.gl/maps/Q7nLVPtyLeXtkNSU8" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                       <div className="w-10 h-10 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center group-hover:scale-110 group-hover:border-blue-300 transition-all">
                          <MapPin className="text-red-500" size={20} />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Lokasi CSD ONLINE</span>
                          <span className="text-xs text-slate-500">Buka di Google Maps</span>
                       </div>
                    </a>

                    {/* WA Link 01 */}
                    <a 
                      href="https://wa.me//+6281311100694" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                       <div className="w-10 h-10 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center group-hover:scale-110 group-hover:border-emerald-300 transition-all">
                          <Phone className="text-emerald-500" size={20} />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">Hubungi Kami</span>
                          <span className="text-xs text-slate-500">WhatsApp Official</span>
                       </div>
                    </a>
                </div>

                <div className="text-center">
                   <p className="text-xs text-slate-400">
                     &copy; {new Date().getFullYear()} CSD ONLINE. Powered by Google Gemini AI.
                   </p>
                </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {renderContent()}
    </div>
  );
};

export default App;