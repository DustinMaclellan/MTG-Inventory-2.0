import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const protectedPaths = [
  "/dashboard",
  "/collection",
  "/storage",
  "/add",
  "/imports",
  "/settings",
  "/subscribe",
];

function isProtected(pathname: string) {
  return (
    protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/api/export")
  );
}

export function proxy(request: NextRequest) {
  if (!isProtected(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/collection",
    "/collection/:path*",
    "/storage",
    "/storage/:path*",
    "/add",
    "/add/:path*",
    "/imports",
    "/imports/:path*",
    "/settings",
    "/settings/:path*",
    "/subscribe",
    "/subscribe/:path*",
    "/api/export",
  ],
};
