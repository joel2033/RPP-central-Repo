import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Edit, AlertCircle } from "lucide-react";
import { Loader } from "@googlemaps/js-api-loader";

interface AddressInputProps {
  value: string;
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

interface ManualAddressFields {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
}

export default function AddressInput({ 
  value, 
  onChange, 
  placeholder = "Enter property address", 
  required = false,
  error 
}: AddressInputProps) {
  const [isManualMode, setIsManualMode] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [manualFields, setManualFields] = useState<ManualAddressFields>({
    street: "",
    suburb: "",
    state: "",
    postcode: ""
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  // Initialize Google Maps API
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // For demo purposes, we'll use a placeholder API key
        // In production, this should be set via environment variables
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "demo-key";
        
        if (apiKey === "demo-key") {
          setApiError("Google Maps API key not configured. Using manual entry mode.");
          return;
        }

        const loader = new Loader({
          apiKey,
          version: "weekly",
          libraries: ["places", "geometry"]
        });

        const google = await loader.load();
        autocompleteService.current = new google.maps.places.AutocompleteService();
        geocoder.current = new google.maps.Geocoder();
        setApiError(null);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        setApiError("Failed to load Google Maps. Using manual entry mode.");
      }
    };

    initializeGoogleMaps();
  }, []);

  // Handle autocomplete search
  const handleInputChange = async (inputValue: string) => {
    onChange(inputValue);
    
    if (!autocompleteService.current || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      autocompleteService.current.getPlacePredictions(
        {
          input: inputValue,
          types: ['address'],
          componentRestrictions: { country: 'au' } // Restrict to Australia
        },
        (predictions, status) => {
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (error) {
      setIsLoading(false);
      console.error("Error fetching suggestions:", error);
      setApiError("Error fetching address suggestions");
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!geocoder.current) return;
    
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      geocoder.current.geocode(
        { placeId: prediction.place_id },
        (results, status) => {
          setIsLoading(false);
          
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            const result = results[0];
            const location = result.geometry.location;
            const coords = { lat: location.lat(), lng: location.lng() };
            
            setCoordinates(coords);
            onChange(result.formatted_address, coords);
          } else {
            setApiError("Unable to get location coordinates");
          }
        }
      );
    } catch (error) {
      setIsLoading(false);
      console.error("Error geocoding address:", error);
      setApiError("Error getting location coordinates");
    }
  };

  // Handle manual address mode
  const handleManualFieldChange = (field: keyof ManualAddressFields, value: string) => {
    const updated = { ...manualFields, [field]: value };
    setManualFields(updated);
    
    // Combine fields into full address
    const fullAddress = [
      updated.street,
      updated.suburb,
      updated.state,
      updated.postcode
    ].filter(Boolean).join(", ");
    
    onChange(fullAddress);
  };

  // Switch to manual mode
  const switchToManualMode = () => {
    setIsManualMode(true);
    setShowSuggestions(false);
    setApiError(null);
    
    // Parse existing address into fields if possible
    if (value) {
      const parts = value.split(", ");
      setManualFields({
        street: parts[0] || "",
        suburb: parts[1] || "",
        state: parts[2] || "",
        postcode: parts[3] || ""
      });
    }
  };

  // Switch back to autocomplete mode
  const switchToAutocompleteMode = () => {
    setIsManualMode(false);
    setManualFields({ street: "", suburb: "", state: "", postcode: "" });
  };

  // Validation
  const isValidAddress = () => {
    if (isManualMode) {
      return manualFields.street && manualFields.suburb && manualFields.state && manualFields.postcode;
    }
    return value && (coordinates || !autocompleteService.current);
  };

  return (
    <div className="space-y-2">
      {!isManualMode ? (
        <div className="relative">
          <div className="relative">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              className={error ? "border-red-500" : ""}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto">
              <CardContent className="p-0">
                {suggestions.map((prediction) => (
                  <div
                    key={prediction.place_id}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSuggestionSelect(prediction)}
                  >
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {prediction.structured_formatting.main_text}
                        </div>
                        <div className="text-xs text-gray-500">
                          {prediction.structured_formatting.secondary_text}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={manualFields.street}
                onChange={(e) => handleManualFieldChange("street", e.target.value)}
                placeholder="123 Main Street"
                className={!manualFields.street && required ? "border-red-500" : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="suburb">Suburb *</Label>
                <Input
                  id="suburb"
                  value={manualFields.suburb}
                  onChange={(e) => handleManualFieldChange("suburb", e.target.value)}
                  placeholder="Suburb"
                  className={!manualFields.suburb && required ? "border-red-500" : ""}
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={manualFields.state}
                  onChange={(e) => handleManualFieldChange("state", e.target.value)}
                  placeholder="State"
                  className={!manualFields.state && required ? "border-red-500" : ""}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                value={manualFields.postcode}
                onChange={(e) => handleManualFieldChange("postcode", e.target.value)}
                placeholder="0000"
                className={!manualFields.postcode && required ? "border-red-500" : ""}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error messages */}
      {(error || apiError) && (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error || apiError}
        </div>
      )}

      {/* Validation message */}
      {required && !isValidAddress() && value && (
        <div className="flex items-center text-amber-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          Please complete all address fields or select from suggestions
        </div>
      )}

      {/* Mode switch buttons */}
      <div className="flex justify-between text-sm">
        {!isManualMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={switchToManualMode}
            className="text-blue-600 hover:text-blue-800"
          >
            <Edit className="h-4 w-4 mr-1" />
            Enter manually
          </Button>
        )}
        
        {isManualMode && !apiError && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={switchToAutocompleteMode}
            className="text-blue-600 hover:text-blue-800"
          >
            <MapPin className="h-4 w-4 mr-1" />
            Use address search
          </Button>
        )}
      </div>

      {/* Map preview placeholder */}
      {coordinates && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            Location confirmed: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
}