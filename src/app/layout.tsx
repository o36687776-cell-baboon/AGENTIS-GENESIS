import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import "@/styles/effects.css";
import { StoreProvider } from "@/state/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AGENTIS GENESIS — Intelligence in Motion",
  description: "The operating environment for intelligent work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[var(--color-void)] text-[var(--color-off-white)] antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
