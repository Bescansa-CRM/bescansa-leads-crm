"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, icon, children, exact = false }: { href: string; icon: string; children: string; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    // El panel queda siempre plegado (ver .sidebar en crm.css): el título hace de tooltip con el nombre completo.
    <Link className={`sidebar-link${active ? " active" : ""}`} href={href} aria-current={active ? "page" : undefined} title={children}>
      <span className="nav-icon" aria-hidden="true">{icon}</span>
      <span className="sidebar-link-label">{children}</span>
    </Link>
  );
}
