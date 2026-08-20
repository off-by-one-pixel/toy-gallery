import { Metadata, Viewport } from 'next';
import 'toy-editor/styles.css';
import 'react-calendar-heatmap/dist/styles.css';
import '../styles/index.css';
import { AuthProvider } from '../providers/AuthProvider';
import { GirthProvider } from '../providers/GirthProvider';
import { LocaleProvider } from '../providers/LocaleProvider';
import { PrivacyProvider } from '../providers/PrivacyProvider';
import { SortProvider } from '../providers/SortProvider';
import { TOY_SORT } from '../services/toySort';
import { ThemeProvider } from '../providers/ThemeProvider';
import { ToastProvider } from '../providers/ToastProvider';
import { UnitProvider } from '../providers/UnitProvider';
import { ViewModeProvider } from '../providers/ViewModeProvider';
import { DEFAULT_THEME, THEMES } from '../themes/registry';

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

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var colors=${JSON.stringify(BROWSER_CHROME)};if(!colors[t])return;document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',colors[t]);}catch(e){}})()`;

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
                      <AuthProvider>{children}</AuthProvider>
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
