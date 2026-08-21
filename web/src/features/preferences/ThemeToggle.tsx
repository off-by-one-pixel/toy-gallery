'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useThemeContext } from '@/features/preferences/ThemeProvider';
import type { Theme } from '@/features/preferences/themeRegistry';

type Props = Readonly<{
  lightTheme: Theme;
  darkTheme: Theme;
}>;

export default function ThemeToggle({ lightTheme, darkTheme }: Props) {
  const { theme, setTheme } = useThemeContext();
  const t = useTranslations('theme');
  const isDark = theme === darkTheme;
  const toggle = () => setTheme(isDark ? lightTheme : darkTheme);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? t('switchToLight') : t('switchToDark')}
      onClick={toggle}
      className="relative inline-flex h-7 w-12 items-center rounded-full bg-surface-tertiary transition-colors hover:bg-surface-tertiary/80"
    >
      <Sun size={12} strokeWidth={2} className="absolute left-1.5 text-text-tertiary" />
      <Moon size={12} strokeWidth={2} className="absolute right-1.5 text-text-tertiary" />
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-thumb shadow-sm transition-transform ${
          isDark ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}
