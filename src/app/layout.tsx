import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssurConnect — Souscription d'assurance collaborative",
  description: "Souscrivez à votre assurance avec l'assistance en temps réel de votre conseiller",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
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
