import type { Metadata } from "next";
import {
  Fraunces,
  Outfit,
  Oswald,
  Bebas_Neue,
  Courier_Prime,
} from "next/font/google";
import "./globals.css";

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

const SITE_NAME = 'Not The Rug';
const SITE_DESCRIPTION =
  'Williamsburg dog walking since 2011. Small groups, the same walker every time, insured and background-checked.';

// Site-level defaults only. Every page sets its own title, description and
// canonical; these apply where one does not. The `template` keeps the brand on
// the end of each page title without every page repeating it.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Williamsburg Dog Walking Since 2011`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — Williamsburg Dog Walking Since 2011`,
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_DESCRIPTION }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Williamsburg Dog Walking Since 2011`,
    description: SITE_DESCRIPTION,
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
      className={`${fraunces.variable} ${outfit.variable} ${oswald.variable} ${bebas.variable} ${courierPrime.variable}`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
