import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MyHabitTracker",
  description: "Log habits, see the year",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="mx-auto max-w-3xl px-5 pb-24">
            <header className="flex items-center justify-between py-6">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                MyHabitTracker
              </Link>
              <nav className="flex gap-5 text-sm text-[var(--muted)]">
                <Link href="/" className="hover:text-[var(--text)]">
                  Today
                </Link>
                <Link href="/review" className="hover:text-[var(--text)]">
                  In-Review
                </Link>
              </nav>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
