import type { SearchParams } from "./types";
export const DEFAULT_REGION = "GB";
export function defaultSearchParams(region: string = DEFAULT_REGION): SearchParams {
    return {
        query: "",
        mediaFilter: "any",
        genre: "",
        minRating: "",
        maxRating: "",
        minYear: "",
        maxYear: "",
        runtime: "",
        language: "",
        sort: "popularity",
        region,
        providers: [],
    };
}
