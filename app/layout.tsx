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

const SITE_URL = process.env.PUBLIC_BASE_URL || 'https://nottherug.com';
const OG_IMAGE = `${SITE_URL}/img/og_meta_img_contact.png`;

const PAGE_TITLE = 'Book a Walk — Free Meet & Greet · Not The Rug';
const PAGE_DESCRIPTION = 'No commitment, no charge. We come to you, meet your dog, and answer every question.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Not The Rug',
    url: SITE_URL,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: PAGE_DESCRIPTION }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
