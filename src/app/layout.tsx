import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssurConnect — Collaborative Insurance Subscription",
  description: "Subscribe to your insurance plan with real-time assistance from your advisor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
