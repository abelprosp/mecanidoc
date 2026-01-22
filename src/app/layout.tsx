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

export const metadata: Metadata = {
  title: "MecaniDoc - Pneus Auto, Moto, Camion",
  description: "Roulez en toute sécurité avec mecanidoc.com",
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
          <div className="mx-auto xl:mx-[100px] bg-[#F1F1F1] min-h-screen overflow-x-hidden">
            {children}
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
