import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.mecanidoc.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MecaniDoc - Pneus Auto, Moto, Camion",
    template: "%s | MecaniDoc",
  },
  description: "Pneus auto, moto, camion et tracteur au meilleur prix, avec montage dans un garage partenaire près de chez vous.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "MecaniDoc",
    title: "MecaniDoc - Pneus Auto, Moto, Camion",
    description: "Pneus auto, moto, camion et tracteur au meilleur prix, avec montage dans un garage partenaire près de chez vous.",
    images: [{ url: "/logo.png" }],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

import { CartProvider } from '@/context/CartContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F1F1F1]`}
      >
        <CartProvider>
          <div className="w-full min-h-screen overflow-x-hidden bg-[#F1F1F1]">
            {children}
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
