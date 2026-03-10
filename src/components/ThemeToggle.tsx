'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

export function ThemeToggle({ inline = false, className = '' }: { inline?: boolean; className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Initialize from localStorage or current DOM state
  useEffect(() => {
    setMounted(true);
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
      const hasDark = document.documentElement.classList.contains('dark');
      const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const nextIsDark = stored ? stored === 'dark' : hasDark || preferDark;
      document.documentElement.classList.toggle('dark', nextIsDark);
      setIsDark(nextIsDark);
    } catch {
      // noop
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // noop
    }
  };

  if (!mounted) return null;

  const base = 'hover:opacity-80 transition-opacity cursor-pointer';
  const fixedPos = 'fixed top-3 right-3 z-50';
  const color = 'text-slate-800 dark:text-white';
  return (
    <Tooltip content={isDark ? 'Light mode' : 'Dark mode'}>
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`${inline ? '' : fixedPos} ${color} ${base} ${className}`}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </Tooltip>
  );
}
