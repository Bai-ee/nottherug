import type { Metadata } from "next";
import {
  Fraunces,
  Outfit,
  Oswald,
  Bebas_Neue,
  Courier_Prime,
} from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/content/site";
import { jsonLd, siteGraph } from "@/lib/content/structuredData";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal"],
  axes: ["opsz"],
});

// Italic is a separate instance so it is not preloaded on every route: only a
// few surfaces set it (the `--font-italic` users in globals.css), and the
// browser still fetches the file on demand when one of them renders.
const frauncesItalic = Fraunces({
  variable: "--font-fraunces-italic",
  subsets: ["latin"],
  style: ["italic"],
  axes: ["opsz"],
  preload: false,
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

// Space Mono (dense numeric/tabular text) moved to app/admin/layout.tsx: it
// has no public-page consumer (grep app/globals.css and every .tsx for
// `--font-mono-data` before moving this back), so loading it here charged
// every public page for a font only the admin dashboard is meant to use.

const OG_IMAGE = '/img/og_meta_mainpage.png';
const OG_IMAGE_SIZE = { width: 548, height: 315 };

const SITE_NAME = 'Not The Rug';
/** Also the homepage title in app/(marketing)/page.tsx; keep the two identical. */
const HOME_TITLE = 'Dog Walker in Williamsburg, Brooklyn | Not The Rug — Since 2011';
const SITE_DESCRIPTION =
  'Experienced Williamsburg dog walkers since 2011. Max 3 dogs per walk, GPS route after every visit, insured and background-checked. Walks from $33. Book a free Meet & Greet.';

// Site-level defaults only. Every page sets its own title, description and
// canonical; these apply where one does not. The `template` keeps the brand on
// the end of each page title without every page repeating it.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE, ...OG_IMAGE_SIZE, alt: SITE_DESCRIPTION }],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
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
      className={`${fraunces.variable} ${frauncesItalic.variable} ${outfit.variable} ${oswald.variable} ${bebas.variable} ${courierPrime.variable}`}
    >
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteGraph()) }} />
        {children}
      </body>
    </html>
  );
}
