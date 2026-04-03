import './globals.css';
import Providers from './providers';

import type { Viewport } from 'next';

export const metadata = {
  title: 'Relay',
  description: 'Relay - The TAMU Formula Electric Order Management System.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
