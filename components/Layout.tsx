
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-emerald-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1.5 rounded-lg">
              <svg className="w-8 h-8 text-emerald-800" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Quran MCP Explorer</h1>
              <p className="text-xs text-emerald-100 opacity-80">Verified Semantic Islamic Context</p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="hover:text-emerald-200 transition-colors">Documentation</a>
            <a href="#" className="hover:text-emerald-200 transition-colors">API Status</a>
            <span className="bg-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-600">v1.0.0-MVP</span>
          </nav>
        </div>
      </header>
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 Quran MCP Project. Powered by Quran.com API & Gemini AI.</p>
        </div>
      </footer>
    </div>
  );
};
