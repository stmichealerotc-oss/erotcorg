/**
 * Backend Integration Guide for Orthodox Library
 * 
 * If you want this app to use your existing church website backend instead of mock data:
 * 
 * 1. Set your backend URL in .env:
 *    BACKEND_API_URL=https://api.yourchurch.com
 *    or
 *    BACKEND_API_URL=http://localhost:5000
 * 
 * 2. Modify the API routes in app/api/* to fetch from your backend instead of mock data.
 * 
 * EXAMPLE: Convert app/api/users/route.ts to call your backend
 */

/**
 * BEFORE (using mock data):
 * ========================
 * import { NextResponse } from "next/server";
 * import { getUsers, createUser } from "@/lib/mockData";
 * 
 * export async function GET() {
 *   const users = await getUsers();
 *   return NextResponse.json({ success: true, data: users });
 * }
 * 
 * AFTER (calling your backend):
 * ===============================
 * import { NextResponse } from "next/server";
 * 
 * const BACKEND = process.env.BACKEND_API_URL || "http://localhost:5000";
 * 
 * export async function GET(request: Request) {
 *   try {
 *     // Pass query params to backend if needed
 *     const url = new URL(request.url);
 *     const backendUrl = `${BACKEND}/api/users${url.search}`;
 *     
 *     const res = await fetch(backendUrl);
 *     if (!res.ok) throw new Error(`Backend error: ${res.status}`);
 *     
 *     const data = await res.json();
 *     return NextResponse.json({ success: true, data });
 *   } catch (error: any) {
 *     return NextResponse.json(
 *       { success: false, error: error.message },
 *       { status: 500 }
 *     );
 *   }
 * }
 * 
 * export async function POST(request: Request) {
 *   try {
 *     const body = await request.json();
 *     
 *     const res = await fetch(`${BACKEND}/api/users`, {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify(body),
 *     });
 *     
 *     const data = await res.json();
 *     return NextResponse.json(data);
 *   } catch (error: any) {
 *     return NextResponse.json({ success: false }, { status: 500 });
 *   }
 * }
 * 
 * ================================
 * API ROUTES TO UPDATE:
 * ================================
 * app/api/users/route.ts               -> GET /users, POST /users
 * app/api/users/[userId]/route.ts      -> GET /users/:id, DELETE /users/:id
 * app/api/books/route.ts               -> GET /books
 * app/api/books/[bookId]/route.ts      -> GET /books/:id
 * app/api/tasks/route.ts               -> GET /tasks
 * app/api/tasks/[taskId]/route.ts      -> GET /tasks/:id
 * app/api/blocks/route.ts              -> GET /blocks
 * etc.
 * 
 * ================================
 * ENVIRONMENT SETUP:
 * ================================
 * 
 * Create .env.local (for local development):
 *   BACKEND_API_URL=http://localhost:5000
 * 
 * On production, set via your hosting platform:
 *   BACKEND_API_URL=https://api.yourchurch.com
 * 
 * ================================
 * AUTHENTICATION PASSTHROUGH:
 * ================================
 * 
 * If your backend requires auth tokens/cookies, forward them:
 * 
 *   const res = await fetch(`${BACKEND}/api/users`, {
 *     method: request.method,
 *     headers: {
 *       "Content-Type": "application/json",
 *       "Authorization": request.headers.get("Authorization") || "",
 *     },
 *     body: request.method !== "GET" ? await request.text() : undefined,
 *   });
 * 
 * ================================
 * STATIC EXPORT DEPLOYMENT:
 * ================================
 * 
 * If deploying as static subfolder + your backend for APIs:
 * 
 * 1. Set basePath in next.config.js:
 *    basePath: '/orthodox',
 * 
 * 2. Run: npm run build
 *    (This exports API routes + static pages)
 * 
 * 3. For static deployment ONLY (HTML, no Node.js):
 *    - You CANNOT use API routes; only serve library as static React app
 *    - Update components to fetch directly from your backend URL:
 *      fetch('https://api.yourchurch.com/books')
 *    - Use NEXT_PUBLIC_API_BASE_URL env var
 */

export {};
