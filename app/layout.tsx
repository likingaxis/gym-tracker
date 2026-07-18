import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { AppDialogProvider } from "@/components/ui/AppDialogProvider";

export const metadata: Metadata = {
  title: "Gym Tracker",
  description: "PWA mobile-first per schede palestra personali",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1113",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <AppDialogProvider><AppShell>{children}</AppShell></AppDialogProvider>
      </body>
    </html>
  );
}
