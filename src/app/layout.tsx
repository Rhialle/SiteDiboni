import type { Metadata } from "next";
import { Rubik } from "next/font/google";

import { EfeitosGlobais } from "@/components/festa/efeitos-globais";

import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Di Boni",
  description: "Sistema da loja Di Boni",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <EfeitosGlobais />
      </body>
    </html>
  );
}
