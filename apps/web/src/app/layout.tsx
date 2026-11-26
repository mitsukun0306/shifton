import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "しふとん！",
  description: "アルバイトのシフト作成・共有・希望提出をまとめて管理",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
