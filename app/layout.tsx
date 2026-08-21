import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Fraunces,
  Outfit,
  Playfair_Display,
  Oswald,
  Bebas_Neue,
  Courier_Prime,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const courierPrime = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${outfit.variable} ${playfair.variable} ${oswald.variable} ${bebas.variable} ${courierPrime.variable}`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
