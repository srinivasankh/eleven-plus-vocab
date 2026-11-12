import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";

// Better Auth's HTTP endpoints (sign-in, sign-up, sign-out, session).
const handler = (request: Request) => toNextJsHandler(getAuth())[request.method as "GET" | "POST"](request);

export const GET = handler;
export const POST = handler;
