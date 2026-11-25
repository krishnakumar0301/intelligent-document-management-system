import Sidebar from './Sidebar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Menu, X, Command } from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children, title, subtitle }) {
  useKeyboardShortcuts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-72 min-h-screen" onClick={(e) => e.stopPropagation()}>
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-surface-400/10 px-6 py-3 lg:px-8 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button
                className="btn-icon lg:hidden -ml-1"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg lg:text-xl font-semibold text-surface-100 truncate">{title}</h1>
                  {subtitle && (
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-surface-800/60 text-2xs text-surface-400 font-mono border border-surface-400/5">
                      {subtitle}
                    </span>
                  )}
                </div>
                <p className="hidden md:block text-2xs text-surface-500 mt-0.5">
                  <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-400 font-mono text-2xs border border-surface-400/5">
                    <Command className="w-2.5 h-2.5" />D
                  </kbd>
                  {' '}Dashboard{' '}
                  <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-400 font-mono text-2xs border border-surface-400/5">
                    <Command className="w-2.5 h-2.5" />F
                  </kbd>
                  {' '}Search{' '}
                  <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-400 font-mono text-2xs border border-surface-400/5">
                    <Command className="w-2.5 h-2.5" />O
                  </kbd>
                  {' '}Organizer{' '}
                  <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-400 font-mono text-2xs border border-surface-400/5">
                    <Command className="w-2.5 h-2.5" />K
                  </kbd>
                  {' '}Chat
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
