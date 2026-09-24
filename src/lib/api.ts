const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8002";

export interface Venue {
  id: string;
  name_raw: string;
  category: string;
  url: string;
  raw: {
    name?: string;
    image_url?: string;
    description?: string;
    score?: number;
    rank_order?: number;
  };
}

export interface CityVenuesResponse {
  city: { id: string; display_name: string };
  venues: Venue[];
}

export async function fetchCityVenues(slug: string, category?: string): Promise<CityVenuesResponse> {
  const url = `${API_BASE}/cities/${slug}/venues${category ? `?category=${category}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch venues for ${slug}`);
  return res.json();
}

export async function fetchCities() {
  const res = await fetch(`${API_BASE}/cities/`);
  if (!res.ok) throw new Error("Failed to fetch cities");
  return res.json();
}
