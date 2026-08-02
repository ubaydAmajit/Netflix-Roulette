import type { Metadata } from "next";
import BrowsePanel from "@/components/BrowsePanel";
import { DEFAULT_REGION, defaultSearchParams } from "@/lib/defaults";
import { searchPage } from "@/lib/search";
import { fetchGenreIndex, fetchLanguages, fetchProviders, fetchRegions } from "@/lib/tmdb";
export const metadata: Metadata = {
    title: "Browse · NextFlix",
    description: "Search and filter everything streaming on your services.",
};
export default async function BrowseRoute() {
    const [genres, regions, languages, providers] = await Promise.all([
        fetchGenreIndex(),
        fetchRegions(),
        fetchLanguages(),
        fetchProviders(DEFAULT_REGION),
    ]);
    const initial = await searchPage(defaultSearchParams(), genres, 1);
    return (<BrowsePanel genres={genres} regions={regions} languages={languages} initialProviders={providers} initialResults={initial}/>);
}
