import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/i18n/provider";
import { getRequestMessages } from "@/i18n/request";
import { appMetadataBase } from "@/lib/app-url";
import { getRequestAccent } from "@/lib/accent-request";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale, m } = await getRequestMessages();
  const description = m.meta.description;
  return {
    metadataBase: appMetadataBase(),
    title: {
      default: "Mystic Ledger",
      template: "%s · Mystic Ledger",
    },
    description,
    applicationName: "Mystic Ledger",
    openGraph: {
      title: "Mystic Ledger",
      description,
      type: "website",
      locale: locale === "fr" ? "fr_CA" : "en_US",
      siteName: "Mystic Ledger",
    },
    twitter: {
      card: "summary",
      title: "Mystic Ledger",
      description,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getRequestMessages();
  const accent = await getRequestAccent();

  return (
    <html
      lang={locale}
      data-accent={accent}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
