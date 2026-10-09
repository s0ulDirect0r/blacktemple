import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import LayoutContent from "@/components/LayoutContent";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

const geistSans = localFont({
  src: "./fonts/Geist-Latin-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Latin-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

const pressStart2P = localFont({
  src: "./fonts/PressStart2P-Regular.ttf",
  variable: "--font-pixel",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: "Black Temple",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  keywords: [
    "Matthew D. Huff",
    "Black Temple",
    "digital art",
    "software engineer",
    "artist",
    "An Infinite Heart",
    "GODCELL",
    "Sun Simulator",
    "New York City",
  ],
  alternates: {
    canonical: "./",
  },
  openGraph: {
    siteName: "Black Temple",
    type: "website",
    locale: "en_US",
    url: "./",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
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
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased bg-black text-white`}
      >
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
