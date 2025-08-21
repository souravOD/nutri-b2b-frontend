// app/layout.tsx (SERVER component - no "use client")
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
// You can keep using your client provider directly; it's fine in a server layout
import { AuthProvider } from "@/hooks/useAuth";

export const metadata: Metadata = {
  title: "Odyssey Nutrition B2B Console",
  description: "B2B platform for dietary compliance and product matching",
  generator: "v0.dev",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // Apply font variables from next/font here (no inline <style> injection)
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
