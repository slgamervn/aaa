import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameVault — Web game project downloads",
  description: "Discover reviewed web-game projects, download published HTML files, or visit their original websites.",
  applicationName: "GameVault",
  metadataBase: new URL("https://gamevault-slg-7f71.vercel.app"),
  openGraph: {
    title: "GameVault — Project collection",
    description: "Browse approved web-game projects and download available HTML files.",
    siteName: "GameVault",
    type: "website"
  },
  robots: { index: false, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#f3f0e7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
