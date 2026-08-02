import type { Metadata, Viewport } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "./globals.css";
export const metadata: Metadata = {
    title: "NextFlix — a Netflix roulette",
    description: "Can't make up your mind for your next binge? We got your NextFlix!",
    icons: { icon: "/nextflix_favicon.png" },
};
export const viewport: Viewport = {
    themeColor: "#0b0b0f",
    colorScheme: "dark",
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return (<html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>);
}
