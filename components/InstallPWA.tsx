
import React, { useEffect, useState } from 'react';

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode) or manually dismissed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone === true;

    // Check if user previously dismissed or installed
    const isDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true';

    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode || isDismissed) return;

    // Check if iOS
    const iosClient = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iosClient);

    // If iOS, show banner after a delay (since we can't detect "can install" event)
    if (iosClient) {
       setTimeout(() => setShowBanner(true), 3000);
    }

    // Android / Chrome: Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not dismissed
      if (!localStorage.getItem('pwa_prompt_dismissed')) {
         setShowBanner(true);
      }
    };

    // Handle successful installation
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa_prompt_dismissed', 'true');
      console.log('PWA installation successful');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false);
        // We don't set dismissed here immediately, 'appinstalled' will handle it.
        // But for safety if event misses:
        setTimeout(() => localStorage.setItem('pwa_prompt_dismissed', 'true'), 1000);
      }
      setDeferredPrompt(null);
    }
  };

  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (isStandalone || !showBanner) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-0.5">Install Sahabat Quran</h3>
            <p className="text-xs text-slate-300">Akses lebih cepat & offline mode.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Tutup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {isIOS ? (
              <button
                onClick={() => setShowIOSInstructions(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap"
              >
                Cara Install
              </button>
            ) : (
              <button
                 onClick={handleInstallClick}
                 className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap"
              >
                Install
              </button>
            )}
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 space-y-4 animate-in slide-in-from-bottom-10">
              <div className="flex items-center justify-between">
                 <h3 className="font-bold text-lg text-slate-900">Install di iPhone / iPad</h3>
                 <button onClick={() => setShowIOSInstructions(false)} className="p-1 bg-slate-100 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl text-emerald-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </div>
                    <div>
                       <p className="text-sm font-bold text-slate-800">1. Klik tombol Share</p>
                       <p className="text-xs text-slate-500">Biasanya ada di bawah tengah layar safari.</p>
                    </div>
                 </div>

                 <div className="w-px h-6 bg-slate-200 ml-5"></div>

                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl text-emerald-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                       <p className="text-sm font-bold text-slate-800">2. Pilih "Add to Home Screen"</p>
                       <p className="text-xs text-slate-500">(Tambah ke Layar Utama)</p>
                    </div>
                 </div>
              </div>

              <button onClick={() => setShowIOSInstructions(false)} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg mt-4">
                 Siap, saya mengerti
              </button>
           </div>
        </div>
      )}
    </>
  );
};
