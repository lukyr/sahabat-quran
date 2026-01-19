
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';

interface ChatWindowProps {
  onLinkClick: (url: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onLinkClick }) => {
  const initialMessage: ChatMessage = { 
    role: 'model', 
    content: 'As-salamu alaykum! Saya adalah Quran MCP Assistant. Ada yang bisa saya bantu hari ini? Anda bisa bertanya seperti "Apa kata Al-Quran tentang sabar?" atau "Tampilkan Al-Baqarah 286".' 
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleClear = () => {
    if (window.confirm('Bersihkan riwayat percakapan?')) {
      setMessages([initialMessage]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiHistory = messages
        .filter((m, idx) => !(idx === 0 && m.role === 'model'))
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      const response = await geminiService.chat(userMessage, apiHistory);
      
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = await Promise.all(
          response.toolCalls.map(async (tc) => {
            const result = await geminiService.executeTool(tc.name, tc.args);
            return { name: tc.name, args: tc.args, result };
          })
        );

        const toolHistory = [
          ...apiHistory,
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: response.toolCalls.map(tc => ({ functionCall: tc })) },
          { 
            role: 'function', 
            parts: toolResults.map(tr => ({ 
              functionResponse: { name: tr.name, response: { result: tr.result } } 
            })) 
          }
        ];
        
        const finalResponse = await geminiService.chat(
          "Tolong berikan jawaban yang lengkap berdasarkan data alat tersebut. Jika hasil pencarian kosong, sampaikan bahwa tidak ada ayat yang sesuai. Jika ada ayat, tampilkan teks Arab dan terjemahannya.", 
          toolHistory
        );
        
        let finalContent = finalResponse.text;
        
        if (!finalContent || finalContent.trim().length === 0) {
          if (toolResults[0].name === 'search_verse' && Array.isArray(toolResults[0].result)) {
            const count = toolResults[0].result.length;
            finalContent = count > 0 
              ? `Saya menemukan ${count} ayat yang berkaitan. Silakan klik referensi di bawah untuk melihat detailnya.` 
              : "Tidak ada ayat yang ditemukan untuk pencarian tersebut.";
          } else {
            finalContent = "Saya telah memproses data Al-Quran untuk Anda. Silakan lihat referensi terverifikasi di bawah.";
          }
        }
        
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: finalContent,
          toolResults
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: response.text }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "Maaf, terjadi kesalahan saat memproses permintaan Anda. Pastikan API Key Anda valid." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceLink = (toolResult: any) => {
    const { name, args } = toolResult;
    if (name === 'get_ayah_details' && args.surah_number && args.ayah_number) {
      return `https://quran.com/id/${args.surah_number}:${args.ayah_number}?translations=33`;
    }
    if (name === 'get_surah_info' && args.surah_number) {
      return `https://quran.com/id/${args.surah_number}?translations=33`;
    }
    return null;
  };

  const renderStyledContent = (text: string) => {
    const urlRegex = /(https?:\/\/quran\.com\/(id\/)?[^\s\)]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part && part.match(urlRegex)) {
        let displayLabel = part
          .split('?')[0]
          .replace('https://quran.com/', '')
          .replace('id/', '')
          .replace('/', ':');
        
        let finalUrl = part;
        if (!finalUrl.includes('quran.com/id/')) {
          finalUrl = finalUrl.replace('quran.com/', 'quran.com/id/');
        }
        if (!finalUrl.includes('translations=33')) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'translations=33';
        }
        
        return (
          <button 
            key={i}
            onClick={() => onLinkClick(finalUrl)}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors border border-emerald-200/50 font-bold align-middle text-[13px]"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
            {displayLabel}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl flex flex-col flex-1 h-full min-h-0 border border-emerald-100 overflow-hidden">
      <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
          </div>
          <h2 className="font-bold text-emerald-900 tracking-tight">
            Obrolan Asisten Quran
          </h2>
        </div>
        
        <button 
          onClick={handleClear}
          className="text-gray-400 hover:text-red-500 transition-all p-2 hover:bg-white rounded-xl group shadow-sm hover:shadow"
          title="Reset Percakapan"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl shadow-sm ${
              m.role === 'user' 
                ? 'bg-emerald-600 text-white shadow-emerald-200/50' 
                : 'bg-white border border-gray-100 text-gray-800'
            }`}>
              <div className="px-5 py-4 whitespace-pre-wrap text-[15px] leading-relaxed font-medium">
                {m.role === 'model' ? renderStyledContent(m.content) : m.content}
              </div>
              
              {m.toolResults && m.toolResults.length > 0 && (
                <div className="px-5 pb-5 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-emerald-100"></div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-600/60">Referensi Terverifikasi</span>
                    <div className="h-px flex-1 bg-emerald-100"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {m.toolResults.map((tr, idx) => {
                      const sourceUrl = getSourceLink(tr);
                      const isError = tr.result && tr.result.error;
                      
                      return (
                        <div key={idx} className={`group flex flex-col justify-between ${isError ? 'bg-red-50 border-red-100' : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100/50'} border rounded-xl p-3 transition-all`}>
                          <div className="flex items-start justify-between mb-2">
                            <span className={`text-[10px] font-bold ${isError ? 'text-red-800 bg-red-100' : 'text-emerald-800 bg-emerald-100'} uppercase px-1.5 py-0.5 rounded`}>
                              {tr.name.replace('_', ' ')}
                            </span>
                            {sourceUrl && (
                              <button 
                                onClick={() => onLinkClick(sourceUrl)}
                                className="text-emerald-600 hover:text-emerald-800 p-1.5 bg-white border border-emerald-100 rounded-lg shadow-sm transition-transform hover:scale-105"
                                title="Buka Referensi Internal"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                            )}
                          </div>
                          <code className={`text-[10px] ${isError ? 'text-red-700' : 'text-emerald-900/70'} font-mono truncate`}>
                            {JSON.stringify(tr.args)}
                          </code>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 flex items-center space-x-3">
              <span className="text-sm font-semibold text-emerald-700">Menganalisis Al-Quran...</span>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 bg-gray-50/80 backdrop-blur-sm border-t border-emerald-100">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Cari kata kunci atau tanya ayat spesifik..."
            className="w-full bg-white border-2 border-emerald-100 rounded-2xl py-4 px-6 pr-14 text-[16px] text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm group-hover:border-emerald-200"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-40 disabled:shadow-none transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};
