import type { Metadata } from "next";
import "@fontsource-variable/libre-franklin";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCE Sales Academy",
  description: "Product and sales training for MCE teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
