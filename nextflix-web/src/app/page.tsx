import Spinner from "@/components/Spinner";
import { DEFAULT_REGION, defaultSearchParams } from "@/lib/defaults";
import { searchPage } from "@/lib/search";
import { fetchGenreIndex, fetchProviders } from "@/lib/tmdb";
export default async function HomePage() {
    const [genres, providers] = await Promise.all([
        fetchGenreIndex(),
        fetchProviders(DEFAULT_REGION),
    ]);
    const initial = await searchPage(defaultSearchParams(), genres, 1);
    return (<Spinner genres={genres} initialPool={initial.items.slice(0, 12)} initialProviders={providers}/>);
}
