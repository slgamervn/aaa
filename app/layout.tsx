import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameVault — A small index of web games",
  description: "A thoughtfully curated place for browser games, with transparent checks and human review before publication.",
  applicationName: "GameVault",
  metadataBase: new URL("https://gamevault-slg-7f71.vercel.app"),
  openGraph: {
    title: "GameVault — A small index of web games",
    description: "Discover browser games. Every submission is reviewed before publication.",
    siteName: "GameVault",
    type: "website"
  },
  robots: { index: false, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#f3f0e7",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
