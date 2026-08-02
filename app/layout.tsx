import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lina | Everyday Injury Helper',
  description: 'Friendly first-aid guidance for common minor injuries at home.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
