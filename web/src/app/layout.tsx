import { Metadata, Viewport } from 'next';
import 'toy-editor/styles.css';
import 'react-calendar-heatmap/dist/styles.css';
import '../styles/index.css';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { GirthProvider } from '@/features/preferences/GirthProvider';
import { LocaleProvider } from '@/features/preferences/LocaleProvider';
import { PrivacyProvider } from '@/features/preferences/PrivacyProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SortProvider } from '@/providers/SortProvider';
import { TOY_SORT } from '@/features/toys/toySort';
import { ThemeProvider } from '@/features/preferences/ThemeProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { UnitProvider } from '@/features/preferences/UnitProvider';
import { ViewModeProvider } from '@/features/preferences/ViewModeProvider';
import { DEFAULT_THEME, THEMES } from '@/features/preferences/themeRegistry';

export const metadata: Metadata = {
  title: 'Toy Gallery',
  description: 'Your collection, shaped to scale.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Toy Gallery',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: THEMES[DEFAULT_THEME].browserChrome,
};

const BROWSER_CHROME = Object.fromEntries(Object.entries(THEMES).map(([name, def]) => [name, def.browserChrome]));

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');try{t=JSON.parse(t)}catch(e){}var colors=${JSON.stringify(BROWSER_CHROME)};if(!colors[t])return;document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',colors[t]);}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-surface-secondary text-foreground min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ToastProvider />
        <ThemeProvider>
          <LocaleProvider>
            <UnitProvider>
              <GirthProvider>
                <ViewModeProvider>
                  <SortProvider config={TOY_SORT}>
                    <PrivacyProvider>
                      <QueryProvider>
                        <AuthProvider>{children}</AuthProvider>
                      </QueryProvider>
                    </PrivacyProvider>
                  </SortProvider>
                </ViewModeProvider>
              </GirthProvider>
            </UnitProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
