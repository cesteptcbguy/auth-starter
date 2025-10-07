// src/app/asset/[id]/not-found.tsx
export default function NotFound() {
  return (
    <main className="p-6">
      <p>Asset not found or not published.</p>
      <a className="underline" href="/catalog">Back to catalog</a>
    </main>
  );
}
