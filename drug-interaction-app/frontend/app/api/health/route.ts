import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error("Backend unavailable");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      status: "mock",
      n_drugs: 19842,
      model_loaded: false,
    });
  }
}
