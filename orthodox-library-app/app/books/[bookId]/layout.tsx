// Server component - exports generateStaticParams for static export
// All child pages ([bookId]/page, display, study, reader) are client components
// that load data at runtime via the API

export function generateStaticParams() {
  // Return empty array - book IDs are dynamic (from DB), resolved client-side
  return [];
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
