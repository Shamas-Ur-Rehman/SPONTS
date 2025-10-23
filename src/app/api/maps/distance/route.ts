import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origins = searchParams.get("origins");
    const destinations = searchParams.get("destinations");
    if (!origins || !destinations) {
      return NextResponse.json(
        { error: "origins et destinations requis" },
        { status: 400 }
      );
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Clé API Google Maps manquante" },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&mode=driving&origins=${origins}&destinations=${destinations}&key=${key}`;
    const res = await fetch(url);
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur proxy distance" },
      { status: 500 }
    );
  }
}
