import type { Metadata } from "next";
import { DM_Mono, Instrument_Serif } from "next/font/google";
import { Web3Provider } from "@/components/providers/Web3Provider";
import "./globals.css";

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "ChainWill — Digital Asset Inheritance",
  description:
    "A smart contract dead man's switch. Your assets reach your beneficiaries — automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
