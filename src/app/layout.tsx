import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GuideButton from "@/components/GuideButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "다했니 월드",
  description: "즐거운 학급 활동 도우미",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <GuideButton />
        <div className="fixed bottom-3 left-4 text-xs text-black/40 hover:text-black/60 transition-colors z-50 pointer-events-none font-medium">
          제작자: 대지부부
        </div>
      </body>
    </html>
  );
}
