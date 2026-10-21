import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { AuthProvider } from '@/lib/auth';
import { SHOP_BLURB, SHOP_NAME, SHOP_TAGLINE } from '@/lib/site';
import './globals.css';

// Self-hosted at build time by next/font; the system stack in globals.css covers any miss.
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-be-vietnam',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  // Absolute base for Open Graph image and canonical URLs.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  title: { default: `${SHOP_NAME} — ${SHOP_TAGLINE}`, template: `%s · ${SHOP_NAME}` },
  description: SHOP_BLURB,
};

export const viewport: Viewport = {
  themeColor: '#F3FAF5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="flex min-h-dvh flex-col">
        <a href="#noi-dung" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink-800 focus:px-4 focus:py-2 focus:text-bg">
          Bỏ qua đến nội dung
        </a>
        <AuthProvider>
          <Header />
          <main id="noi-dung" className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
