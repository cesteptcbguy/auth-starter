export default function Page() {
  return (
    <pre>
      {JSON.stringify(
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
          anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing",
          runtime: process.env.NODE_ENV,
        },
        null,
        2
      )}
    </pre>
  );
}
