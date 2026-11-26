import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "しふとん！",
  description: "アルバイトのための、自分のシフト管理アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
