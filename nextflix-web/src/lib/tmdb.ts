import "server-only";
import type { Choice, GenreOption, MediaType, Provider, TitleAvailability, Trailer, } from "./types";
const BASE_URL = "https://api.themoviedb.org/3";
export const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
export const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
export const LOGO_BASE = "https://image.tmdb.org/t/p/w92";
const DAY = 86400;
function credentials(): {
    headers: HeadersInit;
    query: Record<string, string>;
} {
    const token = process.env.TMDB_ACCESS_TOKEN?.trim();
    if (token) {
        return { headers: { Authorization: `Bearer ${token}` }, query: {} };
    }
    const key = process.env.TMDB_API_KEY?.trim();
    if (key) {
        return { headers: {}, query: { api_key: key } };
    }
    throw new Error("No TMDB credentials. Set TMDB_ACCESS_TOKEN (v4 token) or TMDB_API_KEY (v3 key) in .env.local.");
}
export async function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined> = {}, revalidate: number = 3600): Promise<T | null> {
    let auth: ReturnType<typeof credentials>;
    try {
        auth = credentials();
    }
    catch (error) {
        console.error((error as Error).message);
        return null;
    }
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries({ ...params, ...auth.query })) {
        if (value !== undefined && value !== "")
            url.searchParams.set(key, String(value));
    }
    try {
        const response = await fetch(url, {
            headers: { accept: "application/json", ...auth.headers },
            next: { revalidate },
        });
        if (!response.ok) {
            console.error(`TMDB ${path} responded ${response.status}`);
            return null;
        }
        return (await response.json()) as T;
    }
    catch (error) {
        console.error(`TMDB ${path} request failed`, error);
        return null;
    }
}
export async function mapLimited<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            results[index] = await task(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
}
type GenreListResponse = {
    genres?: Array<{
        id: number;
        name: string;
    }>;
};
async function genreList(mediaType: MediaType): Promise<Map<number, string>> {
    const data = await tmdbFetch<GenreListResponse>(`/genre/${mediaType}/list`, {}, DAY);
    return new Map((data?.genres ?? []).map((genre) => [genre.id, genre.name]));
}
export async function fetchGenreIndex(): Promise<GenreOption[]> {
    const [movie, tv] = await Promise.all([genreList("movie"), genreList("tv")]);
    const byName = new Map<string, GenreOption>();
    for (const [id, name] of movie) {
        byName.set(name, { value: name, label: name, movieId: id });
    }
    for (const [id, name] of tv) {
        const existing = byName.get(name);
        if (existing)
            existing.tvId = id;
        else
            byName.set(name, { value: name, label: name, tvId: id });
    }
    return [...byName.values()].sort((a, b) => a.label.localeCompare(b.label));
}
export async function fetchGenreNames(mediaType: MediaType): Promise<Map<number, string>> {
    return genreList(mediaType);
}
type RegionsResponse = {
    results?: Array<{
        iso_3166_1: string;
        english_name: string;
    }>;
};
export async function fetchRegions(): Promise<Choice[]> {
    const data = await tmdbFetch<RegionsResponse>("/watch/providers/regions", {}, DAY);
    return (data?.results ?? [])
        .map((region) => ({ value: region.iso_3166_1, label: region.english_name }))
        .sort((a, b) => a.label.localeCompare(b.label));
}
type ProvidersResponse = {
    results?: Array<{
        provider_id: number;
        provider_name: string;
        logo_path?: string | null;
        display_priority?: number;
    }>;
};
function baseName(name: string): string {
    return name
        .replace(/\s+(?:standard\s+|basic\s+|premium\s+)?with\s+ads$/i, "")
        .replace(/\s+(?:amazon|apple\s*tv|roku(?:\s+premium)?)\s+channel$/i, "")
        .trim();
}
const PROBE_LIMIT = 28;
const PROVIDER_LIMIT = 20;
const STORE_RATIO_THRESHOLD = 1.3;
export const INCLUDED_MONETIZATION = "flatrate|free|ads";
export async function fetchProviders(region: string): Promise<Provider[]> {
    const data = await tmdbFetch<ProvidersResponse>("/watch/providers/movie", { watch_region: region }, DAY);
    const raw = data?.results ?? [];
    if (raw.length === 0)
        return [];
    const groups = new Map<string, Provider & {
        priority: number;
    }>();
    for (const entry of [...raw].sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))) {
        const name = baseName(entry.provider_name);
        const existing = groups.get(name);
        if (existing) {
            existing.ids.push(String(entry.provider_id));
            continue;
        }
        groups.set(name, {
            id: String(entry.provider_id),
            name,
            logoUrl: entry.logo_path ? `${LOGO_BASE}${entry.logo_path}` : null,
            ids: [String(entry.provider_id)],
            priority: entry.display_priority ?? 999,
        });
    }
    const candidates = [...groups.values()]
        .sort((a, b) => a.priority - b.priority)
        .slice(0, PROBE_LIMIT);
    const countFor = async (ids: string, monetization: string) => {
        const probe = await tmdbFetch<{
            total_results?: number;
        }>("/discover/movie", {
            watch_region: region,
            with_watch_providers: ids,
            with_watch_monetization_types: monetization,
            "vote_count.gte": 20,
        }, DAY);
        return probe?.total_results ?? 0;
    };
    const isSubscription = await mapLimited(candidates, 6, async (provider) => {
        const ids = provider.ids.join("|");
        const included = await countFor(ids, INCLUDED_MONETIZATION);
        if (included === 0)
            return false;
        const rent = await countFor(ids, "rent");
        return rent / included < STORE_RATIO_THRESHOLD;
    });
    return candidates
        .filter((_, index) => isSubscription[index])
        .slice(0, PROVIDER_LIMIT)
        .map(({ id, name, logoUrl, ids }) => ({ id, name, logoUrl, ids }));
}
type ProviderEntry = {
    provider_id: number;
    provider_name: string;
    logo_path?: string | null;
};
type RegionAvailability = {
    link?: string;
    flatrate?: ProviderEntry[];
    free?: ProviderEntry[];
    ads?: ProviderEntry[];
};
type WatchProvidersResponse = {
    results?: Record<string, RegionAvailability>;
};
function includedProviders(entry: RegionAvailability | undefined): ProviderEntry[] {
    return [...(entry?.flatrate ?? []), ...(entry?.free ?? []), ...(entry?.ads ?? [])];
}
export async function isOnAnyProvider(mediaType: MediaType, id: number, region: string, providerIds: Set<string>): Promise<boolean> {
    const data = await tmdbFetch<WatchProvidersResponse>(`/${mediaType}/${id}/watch/providers`, {}, DAY);
    return includedProviders(data?.results?.[region]).some((provider) => providerIds.has(String(provider.provider_id)));
}
export async function fetchTitleAvailability(mediaType: MediaType, id: number, region: string): Promise<TitleAvailability> {
    const data = await tmdbFetch<WatchProvidersResponse>(`/${mediaType}/${id}/watch/providers`, {}, DAY);
    const entry = data?.results?.[region];
    const seen = new Set<string>();
    const services: TitleAvailability["services"] = [];
    for (const provider of includedProviders(entry)) {
        const name = baseName(provider.provider_name);
        if (seen.has(name))
            continue;
        seen.add(name);
        services.push({
            id: String(provider.provider_id),
            name,
            logoUrl: provider.logo_path ? `${LOGO_BASE}${provider.logo_path}` : null,
        });
    }
    return { services, link: entry?.link ?? null };
}
type VideosResponse = {
    results?: Array<{
        key: string;
        site: string;
        type: string;
        name: string;
        official?: boolean;
    }>;
};
export async function fetchTrailer(mediaType: MediaType, id: number): Promise<Trailer | null> {
    const data = await tmdbFetch<VideosResponse>(`/${mediaType}/${id}/videos`, { language: "en-US" }, DAY);
    const candidates = (data?.results ?? []).filter((video) => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser"));
    if (candidates.length === 0)
        return null;
    const rank = (video: (typeof candidates)[number]) => (video.type === "Trailer" ? 0 : 2) + (video.official ? 0 : 1);
    const best = [...candidates].sort((a, b) => rank(a) - rank(b))[0];
    return { key: best.key, name: best.name };
}
type LanguagesResponse = Array<{
    iso_639_1: string;
    english_name: string;
}>;
export async function fetchLanguages(): Promise<Choice[]> {
    const data = await tmdbFetch<LanguagesResponse>("/configuration/languages", {}, DAY);
    if (!Array.isArray(data))
        return [];
    return data
        .filter((language) => language.english_name && language.iso_639_1)
        .map((language) => ({ value: language.iso_639_1, label: language.english_name }))
        .sort((a, b) => a.label.localeCompare(b.label));
}
