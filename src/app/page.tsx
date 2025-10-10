import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BoldBuilder — Catalog & Collections",
};

export default function Home() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-24">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Welcome to BoldBuilder
      </h1>
      <p className="max-w-2xl text-pretty text-gray-600">
        Discover ready-to-use teaching resources, keep collections organized, and
        publish polished catalogs without extra overhead.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/catalog"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
        >
          View Catalog
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
