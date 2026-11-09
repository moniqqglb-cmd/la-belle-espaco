import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Belle Espaço | Agendamento",
  description: "Agende seu procedimento na La Belle Espaço.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
