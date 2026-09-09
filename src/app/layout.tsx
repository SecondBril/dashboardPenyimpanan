import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multi-Cloud Storage Hub | 3x Google Drive + 1x OneDrive',
  description: 'Dashboard personal terpadu untuk 3 akun Google Drive dan 1 akun OneDrive dengan kemampuan drag & drop lintas provider, streaming transfer engine, dan smart auto-organization AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="antialiased selection:bg-blue-500/30 selection:text-blue-200">
        {children}
      </body>
    </html>
  );
}
