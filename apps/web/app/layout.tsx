import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Chirp — Twitter clone",
  description: "Full-stack Twitter clone challenge",
};

function Providers({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <AppHeader />
          <main className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 md:max-w-2xl lg:max-w-3xl">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
