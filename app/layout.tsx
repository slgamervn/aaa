import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameVault — Game library",
  description: "Khám phá, gửi và kiểm duyệt game HTML theo quy trình an toàn.",
  applicationName: "GameVault",
  metadataBase: new URL("https://gamevault.vercel.app"),
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#0b100e",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}