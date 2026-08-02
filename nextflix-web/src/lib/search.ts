import "server-only";
import { BACKDROP_BASE, INCLUDED_MONETIZATION, POSTER_BASE, fetchGenreNames, fetchProviders, isOnAnyProvider, mapLimited, tmdbFetch, } from "./tmdb";
import type { GenreOption, MediaType, Provider, Recommendation, RuntimeBucket, SearchPage, SearchParams, SortOption, } from "./types";
export const VOTE_COUNT_FLOOR = 50;
export const MAX_DISCOVER_PAGE = 500;
const SEARCH_PAGES_PER_REQUEST = 3;
const AVAILABILITY_CONCURRENCY = 10;
function resolveProviderIds(selected: string[], catalogue: Provider[]): {
    query: string;
    set: Set<string>;
} {
    const chosen = selected.length > 0
        ? catalogue.filter((provider) => selected.includes(provider.id))
        : catalogue;
    const ids = chosen.flatMap((provider) => provider.ids);
    return { query: ids.join("|"), set: new Set(ids) };
}
const RUNTIME_BUCKETS: Record<Exclude<RuntimeBucket, "">, {
    gte?: number;
    lte?: number;
}> = {
    short: { lte: 90 },
    medium: { gte: 90, lte: 120 },
    long: { gte: 120 },
};
const SORT_BY: Record<SortOption, Record<MediaType, string>> = {
    popularity: { movie: "popularity.desc", tv: "popularity.desc" },
    rating: { movie: "vote_average.desc", tv: "vote_average.desc" },
    newest: { movie: "primary_release_date.desc", tv: "first_air_date.desc" },
};
type RawResult = {
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    overview?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
    vote_count?: number;
    genre_ids?: number[];
    original_language?: string;
};
type ListResponse = {
    results?: RawResult[];
    total_pages?: number;
    total_results?: number;
};
export function keyOf(mediaType: MediaType, id: number): string {
    return `${mediaType}:${id}`;
}
function toRecommendation(raw: RawResult, mediaType: MediaType, genreNames: Map<number, string>): Recommendation {
    const date = mediaType === "movie" ? raw.release_date : raw.first_air_date;
    return {
        key: keyOf(mediaType, raw.id),
        id: raw.id,
        mediaType,
        title: (mediaType === "movie" ? raw.title : raw.name) ?? "Untitled",
        year: date ? date.slice(0, 4) : "",
        voteAverage: raw.vote_average ?? 0,
        voteCount: raw.vote_count ?? 0,
        synopsis: raw.overview ?? "",
        posterUrl: raw.poster_path ? `${POSTER_BASE}${raw.poster_path}` : null,
        backdropUrl: raw.backdrop_path ? `${BACKDROP_BASE}${raw.backdrop_path}` : null,
        genres: (raw.genre_ids ?? [])
            .map((id) => genreNames.get(id))
            .filter((name): name is string => Boolean(name)),
        tmdbUrl: `https://www.themoviedb.org/${mediaType}/${raw.id}`,
    };
}
function discoverParams(mediaType: MediaType, params: SearchParams, genreIndex: GenreOption[], providerQuery: string): Record<string, string | number | undefined> {
    const genre = genreIndex.find((option) => option.value === params.genre);
    const genreId = mediaType === "movie" ? genre?.movieId : genre?.tvId;
    const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
    const runtime = params.runtime ? RUNTIME_BUCKETS[params.runtime] : {};
    return {
        with_watch_providers: providerQuery,
        watch_region: params.region,
        with_watch_monetization_types: INCLUDED_MONETIZATION,
        with_genres: genreId,
        "vote_average.gte": params.minRating || undefined,
        "vote_average.lte": params.maxRating || undefined,
        "vote_count.gte": VOTE_COUNT_FLOOR,
        [`${dateField}.gte`]: params.minYear ? `${params.minYear}-01-01` : undefined,
        [`${dateField}.lte`]: params.maxYear ? `${params.maxYear}-12-31` : undefined,
        "with_runtime.gte": runtime.gte,
        "with_runtime.lte": runtime.lte,
        with_original_language: params.language || undefined,
        sort_by: SORT_BY[params.sort][mediaType],
        include_adult: "false",
        language: "en-US",
    };
}
async function discover(mediaType: MediaType, params: SearchParams, genreIndex: GenreOption[], providerQuery: string, page: number): Promise<{
    raw: RawResult[];
    totalPages: number;
    totalResults: number;
}> {
    const response = await tmdbFetch<ListResponse>(`/discover/${mediaType}`, {
        ...discoverParams(mediaType, params, genreIndex, providerQuery),
        page,
    });
    return {
        raw: response?.results ?? [],
        totalPages: Math.min(response?.total_pages ?? 0, MAX_DISCOVER_PAGE),
        totalResults: response?.total_results ?? 0,
    };
}
function matchesFilters(raw: RawResult, mediaType: MediaType, params: SearchParams, genreIndex: GenreOption[]): boolean {
    const min = params.minRating ? Number(params.minRating) : null;
    const max = params.maxRating ? Number(params.maxRating) : null;
    const average = raw.vote_average ?? 0;
    if (min !== null && average < min)
        return false;
    if (max !== null && average > max)
        return false;
    const date = mediaType === "movie" ? raw.release_date : raw.first_air_date;
    const year = date ? Number(date.slice(0, 4)) : null;
    if (params.minYear && (year === null || year < Number(params.minYear)))
        return false;
    if (params.maxYear && (year === null || year > Number(params.maxYear)))
        return false;
    if (params.language && raw.original_language !== params.language)
        return false;
    if (params.genre) {
        const genre = genreIndex.find((option) => option.value === params.genre);
        const genreId = mediaType === "movie" ? genre?.movieId : genre?.tvId;
        if (genreId === undefined)
            return false;
        if (!(raw.genre_ids ?? []).includes(genreId))
            return false;
    }
    return true;
}
async function searchText(mediaType: MediaType, params: SearchParams, genreIndex: GenreOption[], providerSet: Set<string>, page: number): Promise<{
    raw: RawResult[];
    totalPages: number;
    totalResults: number;
}> {
    const startPage = (page - 1) * SEARCH_PAGES_PER_REQUEST + 1;
    const responses = await Promise.all(Array.from({ length: SEARCH_PAGES_PER_REQUEST }, (_, offset) => tmdbFetch<ListResponse>(`/search/${mediaType}`, {
        query: params.query,
        include_adult: "false",
        language: "en-US",
        page: startPage + offset,
    })));
    const first = responses[0];
    const tmdbPages = first?.total_pages ?? 0;
    const candidates = responses
        .flatMap((response) => response?.results ?? [])
        .filter((raw) => matchesFilters(raw, mediaType, params, genreIndex));
    const availability = await mapLimited(candidates, AVAILABILITY_CONCURRENCY, (raw) => isOnAnyProvider(mediaType, raw.id, params.region, providerSet));
    return {
        raw: candidates.filter((_, index) => availability[index]),
        totalPages: Math.ceil(tmdbPages / SEARCH_PAGES_PER_REQUEST),
        totalResults: first?.total_results ?? 0,
    };
}
export async function searchPage(params: SearchParams, genreIndex: GenreOption[], page: number = 1): Promise<SearchPage> {
    const catalogue = await fetchProviders(params.region);
    const providers = resolveProviderIds(params.providers, catalogue);
    const usingText = params.query.trim().length > 0;
    if (providers.query === "") {
        return { items: [], page, totalPages: 0, totalResults: 0, approximate: usingText };
    }
    const mediaTypes: MediaType[] = params.mediaFilter === "any" ? ["movie", "tv"] : [params.mediaFilter];
    const [genreNames, ...batches] = await Promise.all([
        Promise.all(mediaTypes.map((mediaType) => fetchGenreNames(mediaType))).then((maps) => {
            const merged = new Map<number, string>();
            for (const map of maps)
                for (const [id, name] of map)
                    merged.set(id, name);
            return merged;
        }),
        ...mediaTypes.map(async (mediaType) => {
            const batch = usingText
                ? await searchText(mediaType, params, genreIndex, providers.set, page)
                : await discover(mediaType, params, genreIndex, providers.query, page);
            return { mediaType, ...batch };
        }),
    ]);
    const items = batches.flatMap((batch) => batch.raw.map((raw) => toRecommendation(raw, batch.mediaType, genreNames)));
    if (mediaTypes.length > 1) {
        items.sort((a, b) => b.voteAverage - a.voteAverage);
    }
    return {
        items,
        page,
        totalPages: Math.max(...batches.map((batch) => batch.totalPages), 0),
        totalResults: batches.reduce((sum, batch) => sum + batch.totalResults, 0),
        approximate: usingText,
    };
}
export async function samplePool(params: SearchParams, genreIndex: GenreOption[]): Promise<Recommendation[]> {
    const first = await searchPage(params, genreIndex, 1);
    if (first.totalPages <= 1 || first.items.length === 0)
        return first.items;
    const page = 1 + Math.floor(Math.random() * first.totalPages);
    if (page === 1)
        return first.items;
    const random = await searchPage(params, genreIndex, page);
    return random.items.length > 0 ? random.items : first.items;
}
