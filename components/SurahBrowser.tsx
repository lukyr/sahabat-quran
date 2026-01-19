
import React, { useState, useEffect } from 'react';
import { quranService } from '../services/quranService';
import { Surah } from '../types';

interface SurahBrowserProps {
  onReadSurah: (url: string) => void;
}

export const SurahBrowser: React.FC<SurahBrowserProps> = ({ onReadSurah }) => {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quranService.getSurahs().then(data => {
      setSurahs(data);
      setLoading(false);
    });
  }, []);

  const filtered = surahs.filter(s => 
    s.name_simple.toLowerCase().includes(filter.toLowerCase()) ||
    s.translated_name.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-emerald-50/50">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Indeks Surah
        </h3>
        <div className="relative">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cari surah..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filtered.map(surah => (
              <div
                key={surah.id}
                className="group relative flex items-center justify-between p-3 rounded-2xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all bg-white"
              >
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-emerald-100 text-gray-500 group-hover:text-emerald-700 flex items-center justify-center font-bold text-xs transition-colors border border-gray-100 group-hover:border-emerald-200">
                    {surah.id}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">{surah.name_simple}</h4>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{surah.translated_name.name} • {surah.verses_count} Ayat</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="font-arabic text-lg text-emerald-900/30 group-hover:text-emerald-900 transition-colors">
                    {surah.name_arabic}
                  </span>
                  <button 
                    onClick={() => onReadSurah(`https://quran.com/id/${surah.id}?translations=33`)}
                    className="opacity-0 group-hover:opacity-100 bg-white shadow-md border border-emerald-100 p-2 rounded-xl text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white"
                    title="Baca Surah"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
