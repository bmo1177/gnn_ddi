import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = searchParams.get("limit") || "8";

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
    );
    if (!res.ok) throw new Error("Backend unavailable");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Mock drug search results
    const allDrugs = [
      "Acetylsalicylic acid",
      "Acetaminophen",
      "Amiodarone",
      "Aspirin",
      "Atenolol",
      "Atorvastatin",
      "Azithromycin",
      "Warfarin",
      "Digoxin",
      "Diltiazem",
      "Furosemide",
      "Gabapentin",
      "Hydrochlorothiazide",
      "Ibuprofen",
      "Lisinopril",
      "Metformin",
      "Metoprolol",
      "Omeprazole",
      "Simvastatin",
      "Losartan",
      "Amlodipine",
      "Sertraline",
      "Fluoxetine",
      "Tramadol",
      "Oxycodone",
      "Morphine",
      "Clopidogrel",
      "Bumetanide",
      "Pegfilgrastim",
      "Magnesium sulfate",
      "Batimastat",
      "Opnurasib",
      "Niprofazone",
    ];

    const query = q.toLowerCase();
    const results = allDrugs
      .filter((drug) => drug.toLowerCase().includes(query))
      .slice(0, parseInt(limit));

    return NextResponse.json({ results });
  }
}
