import { createClient } from "@/utils/supabase/server";
import { ThemeSwitcher } from "@/src/components/theme-switcher";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import NavMenu from "@/src/components/NavMenu";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "HireLens - AI Interview Platform",
  description: "An intelligent interview platform powered by AI",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen flex flex-col">
            <div className="flex-1 w-full flex flex-col">
              <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5">
                  <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2">
                      <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        HireLens
                      </span>
                    </Link>
                    <div className="hidden md:flex gap-4">
                      <Link
                        href="/interview"
                        className="text-sm font-medium hover:text-primary transition-colors"
                      >
                        Start Interview
                      </Link>
                      <Link
                        href="/dashboard"
                        className="text-sm font-medium hover:text-primary transition-colors"
                      >
                        Dashboard
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <ThemeSwitcher />
                    <NavMenu />
                  </div>
                </div>
              </nav>

              <div className="flex-1 flex flex-col max-w-5xl px-5 w-full mx-auto py-8 justify-center items-center">
                {children}
              </div>

              <footer className="w-full border-t mt-auto">
                <div className="max-w-5xl mx-auto py-8 px-5 flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    © 2024 HireLens. All rights reserved.
                  </p>
                  <ThemeSwitcher />
                </div>
              </footer>
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
