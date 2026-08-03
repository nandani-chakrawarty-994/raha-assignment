import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "raha_session";

async function getRole(token: string): Promise<string | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  const isAuthPage = pathname === "/login";
  const isAssociate = pathname.startsWith("/associate");
  const isBranch = pathname.startsWith("/branch-head");
  const isProtected = isAssociate || isBranch;

  if (!token && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (token && isAuthPage) {
    const role = await getRole(token);
    const url = req.nextUrl.clone();
    url.pathname = role === "branch_head" ? "/branch-head" : "/associate";
    return NextResponse.redirect(url);
  }

  if (token && isProtected) {
    const role = await getRole(token);
    if (!role) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (isAssociate && role !== "sales_associate") {
      const url = req.nextUrl.clone();
      url.pathname = "/branch-head";
      return NextResponse.redirect(url);
    }
    if (isBranch && role !== "branch_head") {
      const url = req.nextUrl.clone();
      url.pathname = "/associate";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/associate/:path*", "/branch-head/:path*"],
};
