"use server";
import { recommend } from "@/lib/recommend";
import { searchPage } from "@/lib/search";
import { fetchGenreIndex, fetchProviders, fetchTitleAvailability, fetchTrailer, } from "@/lib/tmdb";
import type { MediaType, Provider, Recommendation, SearchPage, SearchParams, TitleExtras, } from "@/lib/types";
export type SearchResult = {
    ok: true;
    page: SearchPage;
} | {
    ok: false;
    error: string;
};
export type SpinResult = {
    ok: true;
    pick: Recommendation;
    reel: Recommendation[];
} | {
    ok: false;
    error: string;
};
export async function loadProviders(region: string): Promise<Provider[]> {
    try {
        return await fetchProviders(region);
    }
    catch (error) {
        console.error("Provider load failed", error);
        return [];
    }
}
export async function loadTitleExtras(mediaType: MediaType, id: number, region: string): Promise<TitleExtras> {
    try {
        const [availability, trailer] = await Promise.all([
            fetchTitleAvailability(mediaType, id, region),
            fetchTrailer(mediaType, id),
        ]);
        return { availability, trailer };
    }
    catch (error) {
        console.error("Title extras load failed", error);
        return { availability: { services: [], link: null }, trailer: null };
    }
}
function validate(params: SearchParams): string | null {
    if (params.minRating && params.maxRating) {
        if (Number(params.minRating) > Number(params.maxRating)) {
            return "Minimum rating can't be higher than the maximum.";
        }
    }
    if (params.minYear && params.maxYear) {
        if (Number(params.minYear) > Number(params.maxYear)) {
            return "Start year can't be after the end year.";
        }
    }
    return null;
}
export async function searchTitles(params: SearchParams, page: number): Promise<SearchResult> {
    const invalid = validate(params);
    if (invalid)
        return { ok: false, error: invalid };
    try {
        const genreIndex = await fetchGenreIndex();
        return { ok: true, page: await searchPage(params, genreIndex, page) };
    }
    catch (error) {
        console.error("Search failed", error);
        return { ok: false, error: "Couldn't reach TMDB. Try again." };
    }
}
export async function spinRoulette(params: SearchParams, seen: string[]): Promise<SpinResult> {
    const invalid = validate(params);
    if (invalid)
        return { ok: false, error: invalid };
    try {
        const genreIndex = await fetchGenreIndex();
        const spin = await recommend(params, genreIndex, seen);
        if (!spin) {
            return {
                ok: false,
                error: seen.length
                    ? "No more new titles match those filters. Try widening them."
                    : "Nothing on Netflix matches those filters. Try widening them.",
            };
        }
        return { ok: true, pick: spin.pick, reel: spin.reel };
    }
    catch (error) {
        console.error("Spin failed", error);
        return { ok: false, error: "Something went wrong. Try again." };
    }
}
