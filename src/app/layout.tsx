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
    // suppressHydrationWarning: theme.js (abajo) fija data-theme antes de que React hidrate, para no
    // mostrar el tema equivocado un instante. Ese cambio de atributo es intencional; sin este aviso,
    // React marca un "mismatch" en cada carga aunque no haya ningún problema real.
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Antes de pintar: aplica el tema guardado (si el usuario eligió uno a mano) para no mostrar el tema equivocado un instante. */}
        <Script src="/theme.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
