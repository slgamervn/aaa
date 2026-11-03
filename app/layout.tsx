import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PJVault — Thư viện game trên web",
  description: "Khám phá và chơi các game trên web đã được kiểm duyệt. Gửi game HTML hoặc đường dẫn để đề nghị xét duyệt.",
  applicationName: "PJVault",
  metadataBase: new URL("https://gamevault-slg-7f71.vercel.app"),
  openGraph: {
    title: "PJVault — Game library",
    description: "Explore reviewed web games, play HTML games, or visit their original websites.",
    siteName: "PJVault",
    type: "website"
  },
  robots: { index: false, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#f3f6f3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
