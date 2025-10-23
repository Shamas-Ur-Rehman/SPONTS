import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get("input");
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!input) {
      return NextResponse.json(
        { error: "Le paramètre 'input' est requis" },
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
     * Appelle l'API Google Maps Places Autocomplete
     *
     * Configuration optimisée pour la Suisse avec types d'adresses
     */
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&components=country:ch&language=fr&types=address&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Erreur Google Maps API: ${response.status}`);
    }

    const data = await response.json();

    // Log pour debug
    console.log(
      `🔍 API Autocomplete - Input: "${input}", Status: ${
        data.status
      }, Predictions: ${data.predictions?.length || 0}`
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Google Maps:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des suggestions" },
      { status: 500 }
    );
  }
}
