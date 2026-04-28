import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaludOS Argentina",
  description: "Infraestructura de salud digital B2B para el mercado argentino",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
