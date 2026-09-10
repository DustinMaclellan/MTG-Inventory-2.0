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
  // Redirect to login. We intentionally do NOT include a ?next= redirect param
  // here: any future code that reads ?next= must validate it is same-origin
  // before using it, to prevent open-redirect attacks.
  return NextResponse.redirect(new URL("/login", request.url));
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
