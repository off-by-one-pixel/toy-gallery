import { Metadata, Viewport } from 'next';
import 'toy-editor/styles.css';
import 'react-calendar-heatmap/dist/styles.css';
import '../styles/index.css';
import { AuthProvider } from '../providers/AuthProvider';
import { LocaleProvider } from '../providers/LocaleProvider';
import { SortProvider } from '../providers/SortProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { ToastProvider } from '../providers/ToastProvider';
import { UnitProvider } from '../providers/UnitProvider';
import { ViewModeProvider } from '../providers/ViewModeProvider';
import { OS_PREFERENCE_THEME_COLORS } from '../themes/registry';

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
  themeColor: OS_PREFERENCE_THEME_COLORS,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-surface-secondary text-foreground min-h-screen antialiased">
        <ToastProvider />
        <ThemeProvider>
          <LocaleProvider>
            <UnitProvider>
              <ViewModeProvider>
                <SortProvider>
                  <AuthProvider>{children}</AuthProvider>
                </SortProvider>
              </ViewModeProvider>
            </UnitProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
