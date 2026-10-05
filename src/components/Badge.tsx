/** Badge kategori: titik warna + teks berwarna tinta (warna tidak pernah jadi satu-satunya penanda). */
export default function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="badge">
      <i style={{ background: color }} />
      {children}
    </span>
  );
}
