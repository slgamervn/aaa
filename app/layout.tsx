import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PJVault — Thư viện dự án web",
  description: "Khám phá các dự án web đã được kiểm duyệt. Mở trang dự án để xem thông tin, nguồn và bản xem trước.",
  applicationName: "PJVault",
  metadataBase: new URL("https://pjvault-git-design-humanized-library-slg-7f71.vercel.app"),
  openGraph: {
    title: "PJVault — Web project library",
    description: "Explore reviewed web projects, read project details, view previews, and visit original sources.",
    siteName: "PJVault",
    type: "website"
  },
  robots: { index: false, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#edf2f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
