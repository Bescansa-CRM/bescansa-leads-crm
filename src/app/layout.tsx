import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM de leads · Estudio Bescansa",
  description: "Gestión de leads y publicidad de Estudio Bescansa",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Antes de pintar: aplica el tema guardado (si el usuario eligió uno a mano) para no mostrar el tema equivocado un instante. */}
        <Script src="/theme.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
