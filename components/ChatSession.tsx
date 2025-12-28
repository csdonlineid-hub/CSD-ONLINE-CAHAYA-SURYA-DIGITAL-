import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, User, Loader2, AlertCircle, FileSpreadsheet, List, Trash2, CheckCircle2, Phone, Building2, MapPin, X, Image as ImageIcon, Mail } from 'lucide-react';
import { GoogleGenAI, Chat, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";
import { ChatMessage } from '../types';
import { AMBASSADOR_AVATAR_URL } from '../utils/constants';

interface ChatSessionProps {
  onBack: () => void;
}

interface CustomerData {
  id: string;
  fullName: string;
  phoneNumber: string;
  companyName: string;
  address: string;
  email: string;
  timestamp: string;
}

// Definisi Alat: Simpan ke Database Internal
const saveCustomerTool: FunctionDeclaration = {
  name: 'saveCustomerData',
  description: 'Simpan data pelanggan ke database aplikasi. Gunakan ini saat user memberikan info pelanggan.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING, description: "Nama lengkap pelanggan (Wajib)" },
      phoneNumber: { type: Type.STRING, description: "Nomor handphone pelanggan (Wajib). Input angka saja." },
      email: { type: Type.STRING, description: "Alamat email pelanggan (Opsional)" },
      companyName: { type: Type.STRING, description: "Nama percetakan atau usaha (Opsional)" },
      address: { type: Type.STRING, description: "Alamat lengkap/Kota (Opsional)" },
    },
    required: ['fullName', 'phoneNumber']
  }
};

export const ChatSession: React.FC<ChatSessionProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // State untuk Database Lokal
  const [customerDb, setCustomerDb] = useState<CustomerData[]>([]);
  const [showDatabase, setShowDatabase] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInstanceRef = useRef<Chat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Logika Waktu Dinamis
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = "Halo";
    
    if (hour >= 4 && hour < 10) timeGreeting = "Selamat Pagi";
    else if (hour >= 10 && hour < 15) timeGreeting = "Selamat Siang";
    else if (hour >= 15 && hour < 18) timeGreeting = "Selamat Sore";
    else timeGreeting = "Selamat Malam";

    const formattedDate = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Inisialisasi Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatInstanceRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `Anda adalah CASA, asisten administrasi CSD ONLINE.
        Current Context: Today is ${formattedDate}, and the current time is ${formattedTime}.
        
        Tugas Anda: Mengekstrak data pelanggan (Nama, HP, Email, Perusahaan, Alamat) untuk disimpan ke database.
        
        ATURAN LOGIKA:
        1. Jika user memberikan data kontak, PANGGIL function 'saveCustomerData'.
        2. Format No HP: Jika user mengetik '08xx', sistem otomatis mengubah ke '+628xx'.
        3. Pastikan Nama dan No HP terisi. Jika ada Email, pastikan formatnya valid.
        4. Setelah function dipanggil, konfirmasi ke user.
        
        Gaya Bicara: Profesional, Efisien, Bahasa Indonesia.`,
        tools: [{ functionDeclarations: [saveCustomerTool] }],
      },
    });

    setMessages([{
      id: 'welcome',
      role: 'model',
      text: `${timeGreeting}! Saya CASA, Asisten Cerdas CSD Online. Ada yang bisa saya bantu untuk input data pelanggan hari ini?`,
      timestamp: new Date()
    }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Image Handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  // --- LOGIKA UTAMA: Format HP & Simpan ---
  const formatIndonesianPhoneNumber = (phone: string): string => {
    let cleanPhone = phone.replace(/\D/g, ''); // Hapus non-angka
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('62')) {
       // Sudah benar
    } else {
       cleanPhone = '62' + cleanPhone;
    }
    return '+' + cleanPhone;
  };

  const handleDeleteDbItem = (id: string) => {
      setCustomerDb(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (selectedImage) {
         // Vision Mode (Gambar + Teks)
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const imagePart = await fileToGenerativePart(selectedImage);
         const parts = [imagePart, { text: userMsg.text }];
         clearImage();
         
         const result = await ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: { parts }
         });
         
         setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: result.text || "Gambar diproses.",
          timestamp: new Date()
        }]);

      } else if (chatInstanceRef.current) {
        // Chat Mode & Function Calling
        const result = await chatInstanceRef.current.sendMessage({ message: userMsg.text });
        
        if (result.functionCalls && result.functionCalls.length > 0) {
           for (const call of result.functionCalls) {
              if (call.name === 'saveCustomerData') {
                  const args = call.args as any;
                  
                  // 1. Proses Data
                  const formattedPhone = formatIndonesianPhoneNumber(args.phoneNumber);
                  const newCustomer: CustomerData = {
                      id: Date.now().toString(),
                      fullName: args.fullName,
                      phoneNumber: formattedPhone,
                      email: args.email || '-',
                      companyName: args.companyName || '-',
                      address: args.address || '-',
                      timestamp: new Date().toLocaleTimeString()
                  };

                  // 2. Simpan ke State (Database Lokal)
                  setCustomerDb(prev => [newCustomer, ...prev]); 
                  setShowDatabase(true);

                  // 3. Buat Pesan Konfirmasi UI
                  const confirmationMsg: ChatMessage = {
                      id: Date.now().toString(),
                      role: 'model',
                      text: `✅ Data berhasil disimpan di database aplikasi. Ada lagi yang bisa dibantu?`,
                      contactData: { 
                          fullName: newCustomer.fullName,
                          phoneNumber: newCustomer.phoneNumber,
                          email: newCustomer.email !== '-' ? newCustomer.email : undefined,
                          company: newCustomer.companyName !== '-' ? newCustomer.companyName : undefined,
                          address: newCustomer.address !== '-' ? newCustomer.address : undefined
                      },
                      timestamp: new Date()
                  };
                  setMessages(prev => [...prev, confirmationMsg]);

                  // 4. Kirim Balikan ke Gemini
                  await chatInstanceRef.current.sendMessage({
                    message: [{
                      functionResponse: {
                        id: call.id,
                        name: call.name,
                        response: { result: "Success: Data saved to local application database." }
                      }
                    }]
                  });
              }
           }
        } else {
            // Balasan Teks Biasa
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: result.text || "",
                timestamp: new Date()
            }]);
        }
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Maaf, terjadi gangguan koneksi. Mohon coba lagi.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 max-w-5xl mx-auto shadow-2xl md:my-4 md:rounded-2xl overflow-hidden border border-slate-200">
        
      {/* Header Chat */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm z-10">
         <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors md:hidden"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600 hidden md:block">
                    <FileSpreadsheet size={18} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Input Data Pelanggan</h3>
                    <p className="text-xs text-slate-500">Target: Database Aplikasi Internal</p>
                </div>
            </div>
         </div>
         <button 
           onClick={() => setShowDatabase(!showDatabase)}
           className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors ${showDatabase ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
         >
            <List size={14} /> 
            {showDatabase ? 'Tutup DB' : `Database (${customerDb.length})`}
         </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
          
          {/* Area Chat Utama */}
          <div className={`flex-1 flex flex-col transition-all duration-300 ${showDatabase ? 'w-full md:w-2/3' : 'w-full'}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide bg-slate-50/50">
                {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[90%] md:max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar - Updated for Logo */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm overflow-hidden border border-slate-100 ${
                        msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white'
                    }`}>
                        {msg.role === 'user' ? <User size={16} /> : <img src={AMBASSADOR_AVATAR_URL} className="w-full h-full object-contain p-0.5 bg-white" alt="CASA"/>}
                    </div>

                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {/* Bubble Chat */}
                        {msg.text && (
                            <div className={`p-3.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap leading-relaxed ${
                            msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : msg.isError 
                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                            }`}>
                            {msg.text}
                            </div>
                        )}

                        {/* Card Hasil Penyimpanan (Visual Feedback) */}
                        {msg.contactData && (
                            <div className="mt-2 w-full max-w-xs bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden animate-fade-in-up">
                                <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-700">Tersimpan di App</span>
                                </div>
                                <div className="p-4 space-y-2">
                                    <h4 className="font-bold text-slate-900">{msg.contactData.fullName}</h4>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <Phone size={12} className="text-blue-500"/> {msg.contactData.phoneNumber}
                                        </div>
                                        {msg.contactData.email && (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Mail size={12} className="text-purple-500"/> {msg.contactData.email}
                                            </div>
                                        )}
                                        {msg.contactData.company && (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Building2 size={12} className="text-amber-500"/> {msg.contactData.company}
                                            </div>
                                        )}
                                        {msg.contactData.address && (
                                            <div className="flex items-start gap-2 text-xs text-slate-600">
                                                <MapPin size={12} className="text-red-500 mt-0.5"/> {msg.contactData.address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    </div>
                </div>
                ))}
                
                {isLoading && (
                    <div className="flex w-full justify-start pl-10">
                         <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                            <Loader2 className="animate-spin text-emerald-600" size={16} />
                            <span className="text-xs text-slate-500">Memproses data...</span>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                {previewUrl && (
                    <div className="mb-2 relative inline-block">
                        <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                        <button onClick={clearImage} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1"><X size={10} /></button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Contoh: Pak Budi, 08123456789, budi@gmail.com..."
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            disabled={isLoading}
                        />
                        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" id="img-up" />
                        <label htmlFor="img-up" className={`absolute right-3 top-3 cursor-pointer ${selectedImage ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <ImageIcon size={18} />
                        </label>
                    </div>
                    <button type="submit" disabled={isLoading || (!input.trim() && !selectedImage)} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </form>
            </div>
          </div>

          {/* Panel Database (Slide Over) */}
          <div className={`absolute md:relative inset-y-0 right-0 bg-white border-l border-slate-200 w-full md:w-80 transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${showDatabase ? 'translate-x-0' : 'translate-x-full md:hidden'}`}>
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-600"/> Database ({customerDb.length})
                 </h3>
                 <button onClick={() => setShowDatabase(false)} className="md:hidden p-1 text-slate-400"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {customerDb.length === 0 ? (
                     <div className="text-center py-10 text-slate-400">
                         <List size={40} className="mx-auto mb-2 opacity-20"/>
                         <p className="text-xs">Belum ada data pelanggan tersimpan.</p>
                     </div>
                 ) : (
                     customerDb.map((customer) => (
                         <div key={customer.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group relative">
                             <div className="flex justify-between items-start mb-1">
                                 <h4 className="font-bold text-sm text-slate-800">{customer.fullName}</h4>
                                 <span className="text-[10px] text-slate-400">{customer.timestamp}</span>
                             </div>
                             <div className="space-y-1 text-xs text-slate-600">
                                 <div className="flex items-center gap-1.5 font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                                    <Phone size={10} /> {customer.phoneNumber}
                                 </div>
                                 {customer.email !== '-' && (
                                    <div className="flex items-center gap-1.5 text-purple-600 truncate">
                                        <Mail size={10} /> {customer.email}
                                    </div>
                                 )}
                                 <div className="flex items-center gap-1.5 truncate">
                                    <Building2 size={10} /> {customer.companyName}
                                 </div>
                                 <div className="flex items-start gap-1.5 line-clamp-2">
                                    <MapPin size={10} className="mt-0.5" /> {customer.address}
                                 </div>
                             </div>
                             
                             <button 
                               onClick={() => handleDeleteDbItem(customer.id)}
                               className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                               title="Hapus Data"
                             >
                                <Trash2 size={14} />
                             </button>
                         </div>
                     ))
                 )}
             </div>
             {/* Footer Database Removed */}
          </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};