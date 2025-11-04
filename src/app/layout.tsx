import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import AuthMenu from "./components/AuthMenu";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "qfib - ESP32 BLE Controller",
  description: "Control ESP32 devices via Bluetooth Low Energy and WebSocket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} ${orbitron.variable} antialiased`}
      >
        <div className="min-h-screen">
          <header className="w-full border-b border-green-500">
            <div className="max-w-4xl mx-auto px-2 py-2 flex items-center justify-between">
              <a href="/" className="retro-title mb-0 leading-none">fiBLE</a>
              <AuthMenu />
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
