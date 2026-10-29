"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items: [string, string][] = [["/", "Courses"], ["/practice", "Practice"], ["/expert", "ABB Expert"], ["/progress", "My Progress"]];
  if (admin) items.push(["/admin", "Team Results"], ["/admin/content", "Manage"]);
  const active = (href: string) =>
    href === "/" ? path === "/" || path.startsWith("/courses") || path.startsWith("/lessons")
    : href === "/admin" ? path === "/admin"
    : path.startsWith(href);
  return (
    <nav className="nav" aria-label="Main">
      {items.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
