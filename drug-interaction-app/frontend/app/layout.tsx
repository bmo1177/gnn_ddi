import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "DrugGraph — GNN-Powered Drug Interaction Checker",
  description:
    "Check dangerous drug-drug interactions using a Graph Neural Network trained on DrugBank with 19,842 drugs and 1.45M interactions. Test AUC: 0.9933.",
  keywords: ["drug interaction", "GNN", "GraphSAGE", "DrugBank", "pharmacology"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}