import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XeMoth Studio — Alder Lake UHD & NullMoth MUX Suite',
  description:
    'Complete macOS Tahoe Metal 3 Kext builder, OpenCore config.plist patcher, real-time hardware MUX switch controller, S0ix/S3 sleep-wake power manager, and emergency EFI rollback utility for Intel Core i5-12450HX UHD Graphics + NVIDIA RTX 2050.',
  openGraph: {
    title: 'XeMoth Studio — Alder Lake UHD & NullMoth MUX Suite',
    description:
      'Complete macOS Tahoe Metal 3 Kext builder, OpenCore config.plist patcher, real-time hardware MUX switch controller, S0ix/S3 sleep-wake power manager, and emergency EFI rollback utility for Intel Core i5-12450HX UHD Graphics + NVIDIA RTX 2050.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XeMoth Studio — Alder Lake UHD & NullMoth MUX Suite',
    description:
      'Complete macOS Tahoe Metal 3 Kext builder, OpenCore config.plist patcher, real-time hardware MUX switch controller, S0ix/S3 sleep-wake power manager, and emergency EFI rollback utility for Intel Core i5-12450HX UHD Graphics + NVIDIA RTX 2050.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="min-h-screen bg-[#090D16] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
