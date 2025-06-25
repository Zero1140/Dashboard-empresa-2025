import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "../styles/global.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Panel de GST3D",
  description: "Dashboard para gestión de inventario",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}






