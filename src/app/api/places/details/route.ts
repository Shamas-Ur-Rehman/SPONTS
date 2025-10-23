import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("place_id");
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!placeId) {
      return NextResponse.json(
        { error: "Le paramètre 'place_id' est requis" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API Google Maps manquante" },
        { status: 500 }
      );
    }

    /**
     * Appelle l'API Google Maps Place Details
     */
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,address_components&language=fr&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Erreur Google Maps API: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Google Maps:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des détails" },
      { status: 500 }
    );
  }
}
