import { NextRequest, NextResponse } from "next/server";

/**
 * CORS middleware — mobil uygulama (Expo) ve diğer client'ların
 * API'ye erişmesini sağlar. Sadece /api/* route'larına uygulanır.
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";

  // Preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // Normal istekler — response'a CORS header ekle
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// Sadece API route'larına uygula
export const config = {
  matcher: "/api/:path*",
};
