import Link from "next/link";
export default function NotFound() {
  return <main><div className="card empty"><h2>Not found</h2><p>That page was moved or removed.</p><Link className="btn primary" href="/">Back to courses</Link></div></main>;
}
