"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadProviders, searchTitles } from "@/app/actions";
import { DEFAULT_REGION, defaultSearchParams } from "@/lib/defaults";
import { readPrefs, writePrefs } from "@/lib/prefs";
import type { Choice, GenreOption, Provider, Recommendation, SearchPage, SearchParams, } from "@/lib/types";
import Filters, { countActive } from "./Filters";
import ResultGrid, { GridSkeleton } from "./ResultGrid";
import TitleModal from "./TitleModal";
type Props = {
    genres: GenreOption[];
    regions: Choice[];
    languages: Choice[];
    initialProviders: Provider[];
    initialResults: SearchPage;
};
/** Search, filter, and browse experience. */
export default function BrowsePanel({ genres, regions, languages, initialProviders, initialResults, }: Props) {
    const initialRegion = regions.some((region) => region.value === DEFAULT_REGION)
        ? DEFAULT_REGION
        : (regions[0]?.value ?? DEFAULT_REGION);
    const [params, setParams] = useState<SearchParams>(() => defaultSearchParams(initialRegion));
    const [results, setResults] = useState<SearchPage | null>(initialResults);
    const [items, setItems] = useState<Recommendation[]>(initialResults.items);
    const [detail, setDetail] = useState<Recommendation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [providers, setProviders] = useState<Provider[]>(initialProviders);
    const [providersLoading, setProvidersLoading] = useState(false);
    const [isSearching, startSearch] = useTransition();
    const [loadingPage, setLoadingPage] = useState<number | null>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const refreshProviders = useCallback(async (region: string, keepNames?: Set<string>) => {
        setProvidersLoading(true);
        const next = await loadProviders(region);
        setProviders(next);
        setProvidersLoading(false);
        if (keepNames && keepNames.size > 0) {
            const carried = next.filter((p) => keepNames.has(p.name)).map((p) => p.id);
            setParams((previous) => ({ ...previous, providers: carried }));
        }
    }, []);
    const onRegionChange = (region: string) => {
        const keepNames = new Set(providers.filter((p) => params.providers.includes(p.id)).map((p) => p.name));
        setParams((previous) => ({ ...previous, region }));
        void refreshProviders(region, keepNames);
    };
    const restored = useRef(false);
    useEffect(() => {
        if (restored.current)
            return;
        restored.current = true;
        const prefs = readPrefs();
        const region = prefs.region && regions.some((entry) => entry.value === prefs.region)
            ? prefs.region
            : null;
        if (!region && !prefs.providers)
            return;
        setParams((previous) => ({
            ...previous,
            region: region ?? previous.region,
            providers: prefs.providers ?? previous.providers,
        }));
        if (region && region !== initialRegion)
            void refreshProviders(region);
    }, []);
    useEffect(() => {
        if (!restored.current)
            return;
        writePrefs({ region: params.region, providers: params.providers });
    }, [params.region, params.providers]);
    const toggleProvider = (id: string) => {
        setParams((previous) => {
            const current = previous.providers.length === 0 ? providers.map((p) => p.id) : previous.providers;
            const next = current.includes(id)
                ? current.filter((entry) => entry !== id)
                : [...current, id];
            return { ...previous, providers: next.length === providers.length ? [] : next };
        });
    };
    const selectAllProviders = () => {
        setParams((previous) => ({ ...previous, providers: [] }));
    };
    const update = useCallback(<K extends keyof SearchParams>(field: K, value: SearchParams[K]) => {
        setParams((previous) => ({ ...previous, [field]: value }));
    }, []);
    const runSearch = useCallback((page: number, next: SearchParams = params) => {
        setLoadingPage(page);
        startSearch(async () => {
            const result = await searchTitles(next, page);
            setLoadingPage(null);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setError(null);
            setResults(result.page);
            setItems((previous) => page === 1 ? result.page.items : [...previous, ...result.page.items]);
        });
    }, [params]);
    const onSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        runSearch(1);
    };
    const onReset = () => {
        const fresh = defaultSearchParams(initialRegion);
        setParams(fresh);
        runSearch(1, fresh);
    };
    const activeFilters = countActive(params);
    const hasMore = results !== null && results.page < results.totalPages;
    const showSkeleton = isSearching && loadingPage === 1;
    return (<div className="shell browse" ref={topRef}>
      <form onSubmit={onSubmit} className="searchbar">
        <div className="searchbar-row">
          <div className="search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/>
              <path d="m20 20-3.5-3.5" strokeLinecap="round"/>
            </svg>
            <input type="search" value={params.query} onChange={(event) => update("query", event.target.value)} placeholder="Search a title, or just browse…" aria-label="Search titles"/>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSearching}>
            {isSearching ? (<>
                <span className="spinner"/> Searching…
              </>) : ("Search")}
          </button>

          <button type="button" className="btn btn-ghost filter-toggle" onClick={() => setShowFilters((open) => !open)} aria-expanded={showFilters} aria-controls="filters">
            Filters
            {activeFilters > 0 ? <span className="filter-count">{activeFilters}</span> : null}
            <svg className={`chev${showFilters ? " is-open" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="m5 8 7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {showFilters ? (<Filters params={params} genres={genres} regions={regions} languages={languages} providers={providers} providersLoading={providersLoading} disabled={isSearching} onChange={update} onRegionChange={onRegionChange} onToggleProvider={toggleProvider} onSelectAllProviders={selectAllProviders} onApply={() => runSearch(1)} onReset={onReset}/>) : null}
      </form>

      {error ? (<p className="notice">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>) : null}

      <section className="section">
        {showSkeleton ? (<>
            <div className="section-head">
              <h2>Searching…</h2>
            </div>
            <GridSkeleton />
          </>) : items.length === 0 ? (<div className="empty">
            <div className="glyph" aria-hidden="true">
              🔍
            </div>
            <h3>No matches</h3>
            <p>
              Nothing came back for that combination. Try a broader query, or clear a
              filter or two.
            </p>
            <button type="button" className="btn btn-ghost" onClick={onReset}>
              Clear filters
            </button>
          </div>) : (<>
            <div className="section-head">
              <h2>{results?.approximate ? "Available to you" : "Browse"}</h2>
              <span className="count">
                {results?.approximate
                ? `${items.length} confirmed available`
                : `${(results?.totalResults ?? 0).toLocaleString()} titles`}
              </span>
            </div>

            {results?.approximate ? (<p className="hint">
                Text search can&apos;t filter by streaming service, so each result is
                checked individually — these are the ones confirmed on your services in
                this region.
              </p>) : null}

            <ResultGrid items={items} onSelect={setDetail}/>

            {hasMore ? (<div className="load-more">
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => runSearch((results?.page ?? 1) + 1)} disabled={isSearching}>
                  {isSearching && loadingPage !== 1 ? (<>
                      <span className="spinner"/> Loading…
                    </>) : ("Load more")}
                </button>
              </div>) : null}
          </>)}
      </section>

      {detail ? (<TitleModal item={detail} region={params.region} mine={params.providers} onClose={() => setDetail(null)}/>) : null}
    </div>);
}
