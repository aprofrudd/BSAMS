import type { Metadata } from 'next';
import './globals.css';

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
        <header className="bg-primary-dark border-b border-secondary-muted px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-lg sm:text-xl font-bold text-accent">BSAMS</h1>
            <nav className="flex gap-4">
              <span className="text-white/60 text-sm">Dashboard</span>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
