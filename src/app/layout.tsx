import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrawlMind — AI-Powered Web Crawling & Analysis",
  description:
    "Type a URL or plain English — CrawlMind crawls the web, extracts what matters, and lets AI answer your questions. Powered by Cloudflare.",
  keywords: [
    "web scraping",
    "web crawling",
    "AI analysis",
    "data extraction",
    "RAG pipeline",
    "Cloudflare",
  ],
  openGraph: {
    title: "CrawlMind — Ask anything. We find it.",
    description:
      "AI-powered web crawling and analysis. Crawl any website, extract clean data, and ask AI questions about it.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <TooltipProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
