import { Metadata } from 'next';
import 'cone-editor/styles.css';
import 'react-calendar-heatmap/dist/styles.css';
import '../styles/index.css';
import { AuthProvider } from '../providers/AuthProvider';
import { SortProvider } from '../providers/SortProvider';
import { ToastProvider } from '../providers/ToastProvider';
import { UnitProvider } from '../providers/UnitProvider';
import { ViewModeProvider } from '../providers/ViewModeProvider';

export const metadata: Metadata = {
  title: 'Toy Gallery',
  description: 'Toy Gallery',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#f3f4f6" />
      </head>
      <body className="bg-neutral-100 text-neutral-900 min-h-screen antialiased">
        <ToastProvider />
        <UnitProvider>
          <ViewModeProvider>
            <SortProvider>
              <AuthProvider>{children}</AuthProvider>
            </SortProvider>
          </ViewModeProvider>
        </UnitProvider>
      </body>
    </html>
  );
}
