export type MediaType = "movie" | "tv";
export type MediaFilter = MediaType | "any";
export type SortOption = "popularity" | "rating" | "newest";
export type RuntimeBucket = "" | "short" | "medium" | "long";
export type Choice = {
    value: string;
    label: string;
};
export type GenreOption = Choice & {
    movieId?: number;
    tvId?: number;
};
export type Provider = {
    id: string;
    name: string;
    logoUrl: string | null;
    ids: string[];
};
export type TitleAvailability = {
    services: Array<{
        id: string;
        name: string;
        logoUrl: string | null;
    }>;
    link: string | null;
};
export type WheelSegment = {
    key: string;
    posterUrl?: string | null;
    label?: string;
    hue?: number;
};
export type WheelMode = "titles" | "genres";
export type Trailer = {
    key: string;
    name: string;
};
export type TitleExtras = {
    availability: TitleAvailability;
    trailer: Trailer | null;
};
export type SearchParams = {
    query: string;
    mediaFilter: MediaFilter;
    genre: string;
    minRating: string;
    maxRating: string;
    minYear: string;
    maxYear: string;
    runtime: RuntimeBucket;
    language: string;
    sort: SortOption;
    region: string;
    providers: string[];
};
export type Recommendation = {
    key: string;
    id: number;
    mediaType: MediaType;
    title: string;
    year: string;
    voteAverage: number;
    voteCount: number;
    synopsis: string;
    posterUrl: string | null;
    backdropUrl: string | null;
    genres: string[];
    tmdbUrl: string;
};
export type SearchPage = {
    items: Recommendation[];
    page: number;
    totalPages: number;
    totalResults: number;
    approximate: boolean;
};
