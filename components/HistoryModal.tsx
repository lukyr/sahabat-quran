import React, { useEffect, useState } from 'react';
import { Conversation, chatHistoryService } from '../services/chatHistoryService';
import { supabase } from '../services/supabaseClient';
import { AuthModal } from './AuthModal';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  currentConversationId: string | null;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
  currentConversationId
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Delete state
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [deleteConfirmationTitle, setDeleteConfirmationTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
        loadConversations();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      // Subscribe to auth changes to update state when session is restored
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Reload conversations if user just signed in/restored
          loadConversations();
        }
      });

      // Also check initial session
      checkUser();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOpen]);

  const checkUser = async () => {
    // Optimistic check for UI state
    const session = await supabase.auth.getSession().then(({ data }) => data.session).catch(() => null);
    setUser(session?.user ?? null);
  };

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await chatHistoryService.getConversations(searchQuery);
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;

    setIsDeleting(true);
    try {
        await chatHistoryService.deleteConversation(conversationToDelete.id);

        // If the deleted conversation was currently selected, notify parent to clear it
        if (currentConversationId === conversationToDelete.id) {
            onSelectConversation(''); // or however you handle "no selection"
        }

        setConversationToDelete(null);
        setDeleteConfirmationTitle('');
        loadConversations(); // Reload list
    } catch (error) {
        console.error("Failed to delete conversation:", error);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    loadConversations(); // Reload to show anonymous history (if any logic changes or just clears)
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Riwayat Percakapan</h3>
            <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>



          {/* User Status Bar */}
          <div className="mb-4 p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
             {user ? (
               <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                    {user.email?.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-700 truncate">{user.email}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Akun Terhubung</span>
                 </div>
               </div>
             ) : (
                <div className="flex flex-col">
                   <span className="text-xs font-bold text-slate-700">Mode Tamu</span>
                   <span className="text-[10px] text-slate-400">Riwayat hanya di perangkat ini</span>
                </div>
             )}

             {user ? (
                <button onClick={handleLogout} className="text-[10px] font-bold text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-full transition-colors">
                  Keluar
                </button>
             ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="text-[10px] font-bold text-white px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-full transition-colors shadow-sm">
                  Masuk / Daftar
                </button>
             )}
          </div>

          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari riwayat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                {searchQuery ? 'Tidak ditemukan riwayat yang cocok.' : 'Belum ada riwayat percakapan.'}
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative w-full text-left p-4 rounded-2xl border transition-all hover:shadow-md ${
                    currentConversationId === conv.id
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-slate-100 hover:border-emerald-100'
                  }`}
                >
                  <button
                    onClick={() => {
                        onSelectConversation(conv.id);
                        onClose();
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex justify-between items-start mb-1 pr-6">
                        <span className={`text-xs font-bold uppercase tracking-wide ${
                        currentConversationId === conv.id ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                        {formatDate(conv.updated_at)}
                        </span>
                        {currentConversationId === conv.id && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-4 right-4"></span>
                        )}
                    </div>
                    <h4 className={`font-semibold text-sm line-clamp-1 mb-1 pr-6 ${
                        currentConversationId === conv.id ? 'text-emerald-900' : 'text-slate-700'
                    }`}>
                        {conv.title || 'Percakapan Baru'}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pr-6">
                        {conv.last_message_preview}
                    </p>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setConversationToDelete(conv);
                        setDeleteConfirmationTitle('');
                    }}
                    className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 bg-white shadow-sm border border-slate-100"
                    title="Hapus Percakapan"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Delete Confirmation Modal */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Percakapan?</h3>
                <p className="text-sm text-slate-600 mb-4">
                    Tindakan ini tidak dapat dibatalkan. Ketik judul percakapan di bawah ini untuk mengonfirmasi penghapusan:
                </p>
                <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 break-all select-all">
                    {conversationToDelete.title}
                </div>
                <input
                    type="text"
                    value={deleteConfirmationTitle}
                    onChange={(e) => setDeleteConfirmationTitle(e.target.value)}
                    placeholder="Ketik judul di sini..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all mb-4 placeholder:text-slate-400"
                    autoFocus
                />
                <div className="flex gap-3">
                    <button
                        onClick={() => setConversationToDelete(null)}
                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                        disabled={isDeleting}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleDeleteConversation}
                        disabled={deleteConfirmationTitle !== conversationToDelete.title || isDeleting}
                        className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex justify-center items-center gap-2"
                    >
                         {isDeleting ? (
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         ) : (
                             'Hapus'
                         )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};
