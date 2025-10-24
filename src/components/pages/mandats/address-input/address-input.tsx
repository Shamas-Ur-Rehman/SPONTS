"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddressData } from "@/types/mandat";

interface AddressInputProps {
  placeholder: string;
  value: AddressData;
  onChange: (address: AddressData & { details?: any }) => void;
  className?: string;
  showMap?: boolean;
  hideIcon?: boolean; // 👈 add this line
}

interface GooglePlace {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMap;
        Marker: new (options: GoogleMarkerOptions) => GoogleMarker;
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: GoogleAutocompleteOptions
          ) => GoogleAutocomplete;
          PlacesService: new (map: GoogleMap) => GooglePlacesService;
        };
        ControlPosition: {
          RIGHT_BOTTOM: number;
        };
        Animation: {
          DROP: number;
        };
        Size: new (width: number, height: number) => GoogleSize;
        Point: new (x: number, y: number) => GooglePoint;
        InfoWindow: new (options?: GoogleInfoWindowOptions) => GoogleInfoWindow;
      };
    };
    initGoogleMaps: () => void;
  }
}

interface GoogleLatLng {
  lat: number;
  lng: number;
}

interface GoogleMapOptions {
  center: GoogleLatLng;
  zoom: number;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
  zoomControl?: boolean;
  zoomControlOptions?: {
    position: number;
  };
  styles?: Array<{
    featureType?: string;
    elementType?: string;
    stylers?: Array<{ [key: string]: string | number }>;
  }>;
}

interface GoogleMarkerOptions {
  position: GoogleLatLng;
  map: GoogleMap;
  title?: string;
  animation?: number;
  icon?: {
    url: string;
    scaledSize: GoogleSize;
    anchor: GooglePoint;
  };
}

interface GoogleInfoWindowOptions {
  content?: string;
}

interface GoogleAutocompleteOptions {
  types?: string[];
  componentRestrictions?: {
    country: string[];
  };
}

interface GoogleMap {
  addListener: (event: string, handler: () => void) => void;
}

interface GoogleMarker {
  addListener: (event: string, handler: () => void) => void;
}

interface GoogleInfoWindow {
  open: (map: GoogleMap, marker: GoogleMarker) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GoogleSize {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GooglePoint {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GoogleAutocomplete {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GooglePlacesService {}

export function AddressInput({
  placeholder,
  value = { adresse: "" },
  onChange,
  className,
  showMap = true,
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<GooglePlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value?.adresse || "");
  const [showMapView, setShowMapView] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isValidSelection, setIsValidSelection] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);

  /**
   * @param Initialisation de Google Maps
   *
   * Charge dynamiquement l'API Google Maps si elle n'est pas déjà chargée
   */
  const initializeGoogleMaps = () => {
    if (window.google && window.google.maps) {
      setIsMapLoaded(true);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Clé API Google Maps manquante");
      return;
    }

    // Créer le callback global
    window.initGoogleMaps = () => {
      setIsMapLoaded(true);
    };

    // Charger le script Google Maps
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMaps&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  };

  /**
   * @param Création de la carte Google Maps
   *
   * Initialise une carte avec un marqueur à la position sélectionnée
   */
  const createMap = useCallback(() => {
    if (!mapRef.current || !window.google || !value?.lat || !value?.lng) return;

    const mapOptions = {
      center: { lat: value.lat!, lng: value.lng! },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
      },
      styles: [
        {
          featureType: "all",
          elementType: "geometry.fill",
          stylers: [{ weight: "2.00" }],
        },
        {
          featureType: "all",
          elementType: "geometry.stroke",
          stylers: [{ color: "#9c9c9c" }],
        },
        {
          featureType: "all",
          elementType: "labels.text",
          stylers: [{ visibility: "on" }],
        },
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    };

    mapInstanceRef.current = new window.google.maps.Map(
      mapRef.current,
      mapOptions
    );

    // Ajouter un marqueur avec icône personnalisée
    const marker = new window.google.maps.Marker({
      position: { lat: value.lat!, lng: value.lng! },
      map: mapInstanceRef.current,
      title: value?.adresse || "",
      animation: window.google.maps.Animation.DROP,
      icon: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(`
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16 0 0 7.16 0 16C0 24 16 40 16 40C16 40 32 24 32 16C32 7.16 24.84 0 16 0ZM16 22C12.69 22 10 19.31 10 16C10 12.69 12.69 10 16 10C19.31 10 22 12.69 22 16C22 19.31 19.31 22 16 22Z" fill="#ef4444"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(24, 30),
        anchor: new window.google.maps.Point(12, 30),
      },
    });

    // InfoWindow pour afficher l'adresse
    const infoWindow = new window.google.maps.InfoWindow({
      content: `<div style="padding: 8px; font-size: 14px; max-width: 200px;">
        <strong>📍 Adresse sélectionnée</strong><br>
        ${value.adresse}
      </div>`,
    });

    marker.addListener("click", () => {
      if (mapInstanceRef.current) {
        infoWindow.open(mapInstanceRef.current, marker);
      }
    });

    // Ouvrir l'InfoWindow par défaut
    setTimeout(() => {
      if (mapInstanceRef.current) {
        infoWindow.open(mapInstanceRef.current, marker);
      }
    }, 500);
  }, [value?.lat, value?.lng, value?.adresse]);

  /**
   * @param Gestion de l'affichage de la carte
   *
   * Initialise Google Maps et crée la carte quand nécessaire
   */
  useEffect(() => {
    if (showMapView && value?.lat && value?.lng) {
      if (!isMapLoaded) {
        initializeGoogleMaps();
      } else {
        // Petit délai pour s'assurer que le DOM est prêt
        setTimeout(createMap, 100);
      }
    }
  }, [showMapView, value?.lat, value?.lng, isMapLoaded, createMap]);

  /**
   * @param Recréation de la carte quand Google Maps est chargé
   */
  useEffect(() => {
    if (isMapLoaded && showMapView && value?.lat && value?.lng) {
      createMap();
    }
  }, [isMapLoaded, showMapView, value?.lat, value?.lng, createMap]);

  /**
   * @param Vérification de la validité de la sélection
   *
   * Une adresse est valide si elle a des coordonnées (lat/lng)
   */
  useEffect(() => {
    setIsValidSelection(!!(value?.lat && value?.lng));
  }, [value?.lat, value?.lng]);

  /**
   * @param Initialisation de Google Maps au montage du composant
   */
  useEffect(() => {
    initializeGoogleMaps();
  }, []);

  /**
   * Charge les suggestions d'adresses via l'API backend (plus fiable)
   */
  const loadSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);

    try {
      console.log(`🔍 Chargement suggestions pour: "${query}"`);

      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        console.warn(
          "Erreur lors de la récupération des suggestions:",
          response.status
        );
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const data = await response.json();

      console.log(`📊 Réponse API:`, data);

      if (data.status === "OK") {
        setSuggestions(data.predictions || []);
        setShowSuggestions(true);
        console.log(`✅ ${data.predictions?.length || 0} suggestions trouvées`);
      } else {
        console.warn(
          "Erreur Google Maps API:",
          data.status,
          data.error_message
        );
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.warn("Erreur lors du chargement des suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Récupère les détails d'une adresse sélectionnée via l'API backend
   */
  const getPlaceDetails = async (
    placeId: string
  ): Promise<(AddressData & { details?: any }) | null> => {
    try {
      const response = await fetch(`/api/places/details?place_id=${placeId}`);

      if (!response.ok) {
        console.warn(
          "Erreur lors de la récupération des détails:",
          response.status
        );
        return null;
      }

      const data = await response.json();

      if (data.status === "OK" && data.result) {
        const place = data.result;
        const geometry = place.geometry || {};

        // Extraire les coordonnées
        const lat = geometry.location?.lat;
        const lng = geometry.location?.lng;

        if (!lat || !lng) {
          console.warn("Coordonnées manquantes dans les détails du lieu");
          return null;
        }

        // Construire l'adresse complète
        const formattedAddress = place.formatted_address || "";

        return {
          adresse: formattedAddress,
          lat,
          lng,
          details: place, // Inclure tous les détails Google Maps
        };
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération des détails:", error);
      return null;
    }
  };

  /**
   * Gère la sélection d'une suggestion d'adresse
   */
  const handleSuggestionSelect = async (suggestion: GooglePlace) => {
    try {
      const addressData = await getPlaceDetails(suggestion.place_id);

      if (addressData) {
        onChange(addressData);
        setInputValue(addressData.adresse);
        setShowSuggestions(false);
        setIsValidSelection(true);
      }
    } catch (error) {
      console.error("Erreur lors de la sélection de l'adresse:", error);
    }
  };

  /**
   * Gère les changements dans l'input
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsValidSelection(false);

    // Charger les suggestions
    loadSuggestions(newValue);

    // Si l'input est vide, réinitialiser
    if (!newValue.trim()) {
      onChange({ adresse: "", lat: 0, lng: 0 });
      setShowSuggestions(false);
    }
  };

  /**
   * Gère le focus sur l'input
   */
  const handleFocus = () => {
    if (inputValue.trim().length >= 2) {
      setShowSuggestions(true);
    }
  };

  /**
   * Bascule l'affichage de la carte
   */
  const toggleMapView = () => {
    setShowMapView(!showMapView);
  };

  /**
   * Gère les clics en dehors des suggestions
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * Met à jour l'input quand la valeur change
   */
  useEffect(() => {
    setInputValue(value?.adresse || "");
  }, [value?.adresse]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className={cn(
            "pr-20",
            !isValidSelection &&
              inputValue.trim().length > 0 &&
              "border-orange-500 focus:border-orange-500"
          )}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          {/* Bouton pour afficher/masquer la carte */}
          {showMap && value.lat && value.lng && (
            <button
              type="button"
              onClick={toggleMapView}
              className="p-1 rounded hover:bg-accent transition-colors"
              title={showMapView ? "Masquer la carte" : "Afficher la carte"}
            >
              <MapIcon
                className={cn(
                  "h-4 w-4 transition-colors",
                  showMapView ? "text-primary" : "text-muted-foreground"
                )}
              />
            </button>
          )}

          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Message d'aide pour forcer la sélection */}
      {!isValidSelection && inputValue.trim().length > 0 && (
        <div className="mt-1 text-xs text-orange-600">
          ⚠️ Veuillez sélectionner une adresse dans la liste des suggestions
        </div>
      )}

      {/* Suggestions d'adresses */}
      {showSuggestions &&
        Array.isArray(suggestions) &&
        suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="text-sm font-medium">
                  {suggestion.structured_formatting.main_text}
                </div>
                <div className="text-xs text-muted-foreground">
                  {suggestion.structured_formatting.secondary_text}
                </div>
              </button>
            ))}
          </div>
        )}

      {/* Carte Google Maps */}
      {showMap && showMapView && value?.lat && value?.lng && (
        <div className="mt-3 border border-border rounded-md overflow-hidden">
          <div
            ref={mapRef}
            className="w-full h-64"
            style={{ minHeight: "250px" }}
          />
        </div>
      )}

      {/* Indicateur de géolocalisation */}
      {value?.lat && value?.lng && (
        <div className="mt-1 text-xs text-muted-foreground">
          📍 Coordonnées: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}
