import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { AthleteProvider } from '@/lib/contexts/AthleteContext';
import { AppHeader } from '@/components/AppHeader';

export const metadata: Metadata = {
  title: 'BSAMS - Boxing Science Athlete Management System',
  description: 'High-performance athlete management and CMJ analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen">
        <AuthProvider>
          <AthleteProvider>
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              {children}
            </main>
          </AthleteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
