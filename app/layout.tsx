import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReadTik — Sound Alerts y TTS para TikTok Live',
  description: 'Herramienta de alertas de sonido y lectura de voz (Text-to-Speech) para transmisiones en directo de TikTok.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#191A23',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-[#0F0F12] text-slate-100 min-h-screen antialiased selection:bg-[#FE2C55] selection:text-white">
        {children}
      </body>
    </html>
  );
}
