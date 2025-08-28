import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PrivyProvider from "./components/PrivyProvider";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CLICK EMPIRE — If you enjoy building Nads, keep clicking.",
    template: "%s — CLICK EMPIRE",
  },
  description:
    "Building is a click, and the more you click, the more you succeed. Come on, let’s build!",
  metadataBase: new URL("https://clickempire.vercel.app/"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    url: "https://clickempire.vercel.app/",
    siteName: "CLICK EMPIRE",
    title: "CLICK EMPIRE — If you enjoy building Nads, keep clicking.",
    description:
      "Building is a click, and the more you click, the more you succeed. Come on, let’s build!",
    images: [{ url: "/og.png" }], // /public/og.png
  },
  twitter: {
    card: "summary_large_image",
    title: "CLICK EMPIRE — If you enjoy building Nads, keep clicking.",
    description:
      "Building is a click, and the more you click, the more you succeed. Come on, let’s build!",
    images: ["/og.png"], // /public/og.png
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PrivyProvider>{children}</PrivyProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
