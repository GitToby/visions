import type { ReactNode } from "react";
import { Header } from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-base-200">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
