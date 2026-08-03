import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { loginSchema } from "@/lib/validations";
import { badRequest, setSessionCookie, signToken } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid email or password", parsed.error.flatten());
    }

    await connectDB();
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const authUser: AuthUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      reportsTo: user.reportsTo ? user.reportsTo.toString() : null,
    };

    const token = await signToken(authUser);
    await setSessionCookie(token);

    return NextResponse.json({ user: authUser });
  } catch (error) {
    console.error("POST /api/auth/login", error);
    const message = error instanceof Error ? error.message : "";
    if (/MONGODB_URI|JWT_SECRET|ECONNREFUSED|querySrv|MongoNetwork|MongoServerError/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Cannot connect to the database. Check MONGODB_URI in .env.local and that MongoDB Atlas allows your IP.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
