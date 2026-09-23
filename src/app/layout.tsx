import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "واصل نالوت | Wasel Nalut — منظومة التوصيل الفائقة",
  description:
    "سوبر-آب التوصيل المحلي لمدينة نالوت وجبل نفوسة: واصل إيت، واصل مارت، واصل متاع — بالدينار الليبي حصرياً",
  keywords: ["واصل نالوت", "توصيل", "نالوت", "ليبيا", "Wasel Nalut", "delivery"],
  authors: [{ name: "Wasel Nalut Operations" }],
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = {
  themeColor: "#041710",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --font-app: 'Cairo', 'Segoe UI', Tahoma, sans-serif; --font-money: 'Outfit', 'Segoe UI', sans-serif; }`,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
