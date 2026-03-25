import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

function classify_risk(prob: number) {
  if (prob >= 0.7)
    return {
      risk_level: "HIGH",
      risk_color: "#E05252",
      advice:
        "Avoid this combination. Consult prescribing physician immediately.",
    };
  if (prob >= 0.4)
    return {
      risk_level: "MODERATE",
      risk_color: "#EF9F27",
      advice: "Monitor patient closely. Dose adjustment may be required.",
    };
  return {
    risk_level: "LOW",
    risk_color: "#1D9E75",
    advice: "Generally safe. Monitor for unusual symptoms.",
  };
}

function generateMockInteractions(drugs: string[]) {
  const interactions = [];

  const highRiskPairs = [
    ["Amiodarone", "Digoxin"],
    ["Amiodarone", "Warfarin"],
    ["Warfarin", "Aspirin"],
    ["Digoxin", "Furosemide"],
  ];
  const moderateRiskPairs = [
    ["Ibuprofen", "Aspirin"],
    ["Lisinopril", "Potassium"],
  ];

  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      let prob = Math.random();

      const pair = [drugs[i], drugs[j]].sort();
      if (highRiskPairs.some((p) => p[0] === pair[0] && p[1] === pair[1])) {
        prob = 0.7 + Math.random() * 0.3;
      } else if (moderateRiskPairs.some((p) => p[0] === pair[0] && p[1] === pair[1])) {
        prob = 0.4 + Math.random() * 0.3;
      }

      const { risk_level, risk_color, advice } = classify_risk(prob);

      interactions.push({
        drug_a: drugs[i],
        drug_b: drugs[j],
        probability: parseFloat(prob.toFixed(4)),
        risk_level,
        risk_color,
        advice,
      });
    }
  }

  interactions.sort((a, b) => b.probability - a.probability);
  return interactions;
}

export async function POST(request: Request) {
  let drugs: string[] = [];

  try {
    const body = await request.json();
    drugs = body.drugs || [];
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drugs }),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend unavailable, use mock
  }

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

  const errors: string[] = [];
  const validDrugs = drugs.filter((d) => {
    const lower = d.toLowerCase();
    const found = allDrugs.some((drug) => drug.toLowerCase().includes(lower));
    if (!found) errors.push(`"${d}" not found`);
    return found;
  });

  const interactions = generateMockInteractions(validDrugs);

  const high = interactions.filter((i) => i.risk_level === "HIGH").length;
  const moderate = interactions.filter((i) => i.risk_level === "MODERATE").length;
  const low = interactions.filter((i) => i.risk_level === "LOW").length;
  const maxProb =
    interactions.length > 0
      ? Math.max(...interactions.map((i) => i.probability))
      : 0;

  let overall_risk = "LOW";
  if (high > 0) overall_risk = "HIGH";
  else if (moderate > 0) overall_risk = "MODERATE";

  return NextResponse.json({
    interactions,
    summary: {
      total_pairs: interactions.length,
      high_risk: high,
      moderate_risk: moderate,
      low_risk: low,
      overall_risk,
      max_probability: parseFloat(maxProb.toFixed(4)),
    },
    errors,
  });
}
