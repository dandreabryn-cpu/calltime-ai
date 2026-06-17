import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Call Time — AI Call Session",
  description: "Run a fundraising call time session with AI-assisted briefing and outcome logging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
