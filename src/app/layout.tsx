import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM de leads · Estudio Bescansa",
  description: "Gestión de leads y publicidad de Estudio Bescansa",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
