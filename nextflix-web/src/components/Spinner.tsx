"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { loadProviders, loadTitleExtras, searchTitles, spinRoulette } from "@/app/actions";
import { DEFAULT_REGION, defaultSearchParams } from "@/lib/defaults";
import { sampleGenres, shortGenre, wheelHue } from "@/lib/genres";
import { readPrefs } from "@/lib/prefs";
import type { GenreOption, Provider, Recommendation, SearchParams, WheelMode, WheelSegment, } from "@/lib/types";
import Hero from "./Hero";
import TitleModal from "./TitleModal";
const SEEN_MEMORY = 20;
const DEFAULT_GENRE_COUNT = 8;
const MAX_WHEEL_GENRES = 12;
type Props = {
    genres: GenreOption[];
    initialPool: Recommendation[];
    initialProviders: Provider[];
};
/** Roulette state and spin flow. */
export default function Spinner({ genres, initialPool, initialProviders }: Props) {
    const [params, setParams] = useState<SearchParams>(() => defaultSearchParams());
    const [providers, setProviders] = useState<Provider[]>(initialProviders);
    const [pool, setPool] = useState<Recommendation[]>(initialPool);
    const [pick, setPick] = useState<Recommendation | null>(null);
    const [detail, setDetail] = useState<Recommendation | null>(null);
    const [seen, setSeen] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [spinToken, setSpinToken] = useState(0);
    const [abortToken, setAbortToken] = useState(0);
    const [isSpinning, startSpin] = useTransition();
    const [poolLoading, startPool] = useTransition();
    const [mode, setMode] = useState<WheelMode>("titles");
    const genreNames = useMemo(() => genres.map((genre) => genre.value), [genres]);
    const [genreCount, setGenreCount] = useState(DEFAULT_GENRE_COUNT);
    const [wheelGenres, setWheelGenres] = useState<string[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pendingSegment, setPendingSegment] = useState<WheelSegment | null>(null);
    const [pendingTitle, setPendingTitle] = useState<Recommendation | null>(null);
    const [wonGenre, setWonGenre] = useState<string | null>(null);
    const [pickHasTrailer, setPickHasTrailer] = useState(false);
    const [autoplayTrailer, setAutoplayTrailer] = useState(false);
    useEffect(() => {
        if (wheelGenres.length === 0 && genreNames.length > 0) {
            setWheelGenres(sampleGenres(genreNames, DEFAULT_GENRE_COUNT));
        }
    }, [genreNames, wheelGenres.length]);
    useEffect(() => {
        if (!pick) {
            setPickHasTrailer(false);
            return;
        }
        let live = true;
        setPickHasTrailer(false);
        loadTitleExtras(pick.mediaType, pick.id, params.region).then((extras) => {
            if (live)
                setPickHasTrailer(extras.trailer !== null);
        });
        return () => {
            live = false;
        };
    }, [pick, params.region]);
    const refreshPool = useCallback((next: SearchParams) => {
        startPool(async () => {
            const result = await searchTitles(next, 1);
            if (result.ok && result.page.items.length > 0) {
                setPool(result.page.items.slice(0, 12));
            }
        });
    }, []);
    const restored = useRef(false);
    useEffect(() => {
        if (restored.current)
            return;
        restored.current = true;
        const prefs = readPrefs();
        if (!prefs.region && !prefs.providers)
            return;
        const next = {
            ...defaultSearchParams(),
            region: prefs.region ?? DEFAULT_REGION,
            providers: prefs.providers ?? [],
        };
        setParams(next);
        if (prefs.region && prefs.region !== DEFAULT_REGION) {
            void loadProviders(prefs.region).then(setProviders);
        }
        refreshPool(next);
    }, [refreshPool]);
    const genreWheel = useMemo(() => {
        const names = wheelGenres.slice(0, MAX_WHEEL_GENRES);
        const planted = mode === "genres" && pendingSegment?.key.startsWith("genre:")
            ? pendingSegment.key.slice("genre:".length)
            : null;
        if (!planted)
            return { names, swappedAt: -1 };
        const at = names.indexOf(planted);
        if (at === -1)
            return { names, swappedAt: -1 };
        const usedLabels = new Set(names.map(shortGenre));
        const spare = genreNames.find((name) => !names.includes(name) && !usedLabels.has(shortGenre(name)));
        if (!spare)
            return { names, swappedAt: -1 };
        const swapped = [...names];
        swapped[at] = spare;
        return { names: swapped, swappedAt: at };
    }, [wheelGenres, mode, pendingSegment, genreNames]);
    const segments: WheelSegment[] = useMemo(() => {
        if (mode === "genres") {
            const count = genreWheel.names.length;
            return genreWheel.names.map((name, index) => ({
                key: `genre:${name}`,
                label: shortGenre(name),
                hue: index === genreWheel.swappedAt
                    ? Math.round((wheelHue(index, count) + 180 / count) % 360)
                    : wheelHue(index, count),
            }));
        }
        return pool.map((item) => ({ key: item.key, posterUrl: item.posterUrl, label: item.title }));
    }, [mode, genreWheel, pool]);
    const setGenre = useCallback((genre: string) => {
        const next = { ...params, genre };
        setParams(next);
        refreshPool(next);
    }, [params, refreshPool]);
    const onSpin = () => {
        setError(null);
        setPendingSegment(null);
        setPendingTitle(null);
        if (mode === "genres") {
            const options = wheelGenres.slice(0, MAX_WHEEL_GENRES);
            if (options.length < 2) {
                setError("Put at least two genres on the wheel first.");
                return;
            }
            const at = Math.floor(Math.random() * options.length);
            const chosen = options[at];
            setWonGenre(null);
            setSpinToken((token) => token + 1);
            setPendingSegment({
                key: `genre:${chosen}`,
                label: shortGenre(chosen),
                hue: wheelHue(at, options.length),
            });
            return;
        }
        setSpinToken((token) => token + 1);
        startSpin(async () => {
            const result = await spinRoulette(params, seen);
            if (!result.ok) {
                setAbortToken((token) => token + 1);
                setError(result.error);
                return;
            }
            if (result.reel.length > 0)
                setPool(result.reel);
            setPendingTitle(result.pick);
            setPendingSegment({
                key: result.pick.key,
                posterUrl: result.pick.posterUrl,
                label: result.pick.title,
            });
        });
    };
    const onLanded = useCallback(() => {
        if (mode === "genres") {
            setPendingSegment((segment) => {
                if (segment?.key.startsWith("genre:")) {
                    setWonGenre(segment.key.slice("genre:".length));
                }
                return segment;
            });
            return;
        }
        setPendingTitle((winner) => {
            if (winner) {
                setPick(winner);
                setSeen((previous) => [winner.key, ...previous].slice(0, SEEN_MEMORY));
            }
            return winner;
        });
    }, [mode]);
    const onUseGenre = () => {
        if (!wonGenre)
            return;
        setMode("titles");
        setPendingSegment(null);
        setPick(null);
        setGenre(wonGenre);
    };
    const onModeChange = (next: WheelMode) => {
        if (next === mode)
            return;
        setMode(next);
        setPendingSegment(null);
        setPendingTitle(null);
        setWonGenre(null);
        setError(null);
        if (next === "genres")
            setPick(null);
        setAbortToken((token) => token + 1);
    };
    const onSelectSegment = (segment: WheelSegment) => {
        if (mode === "genres") {
            const name = segment.key.replace(/^genre:/, "");
            setWonGenre(name);
            return;
        }
        const item = pool.find((entry) => entry.key === segment.key);
        if (item) {
            setAutoplayTrailer(false);
            setDetail(item);
        }
    };
    const serviceSummary = (() => {
        if (providers.length === 0)
            return "Loading services…";
        if (params.providers.length === 0)
            return "On all your services";
        const names = providers
            .filter((provider) => params.providers.includes(provider.id))
            .map((provider) => provider.name);
        if (names.length === 0)
            return "No services selected";
        const shown = names.slice(0, 2).join(", ");
        return names.length > 2 ? `On ${shown} +${names.length - 2}` : `On ${shown}`;
    })();
    return (<>
      <Hero pick={pick} segments={segments} spinToken={spinToken} abortToken={abortToken} pendingSegment={pendingSegment} isSpinning={isSpinning} serviceSummary={serviceSummary} mode={mode} onModeChange={onModeChange} genres={genres} genre={params.genre} onGenreChange={setGenre} wheelGenres={wheelGenres} genreCount={genreCount} pickerOpen={pickerOpen} onTogglePicker={() => setPickerOpen((open) => !open)} maxWheelGenres={MAX_WHEEL_GENRES} onGenreCountChange={(next) => {
            setGenreCount(next);
            if (wheelGenres.length < next) {
                setWheelGenres(sampleGenres(genreNames, next));
            }
        }} onToggleWheelGenre={(name) => setWheelGenres((previous) => previous.includes(name)
            ? previous.filter((entry) => entry !== name)
            : [...previous, name])} onRandomiseGenres={() => setWheelGenres(sampleGenres(genreNames, genreCount))} wonGenre={wonGenre} onUseGenre={onUseGenre} poolLoading={poolLoading} onSpin={onSpin} onLanded={onLanded} onSelectSegment={onSelectSegment} onDetails={(next) => {
            setAutoplayTrailer(false);
            setDetail(next);
        }} hasTrailer={pickHasTrailer} onPlayTrailer={() => {
            setAutoplayTrailer(true);
            setDetail(pick);
        }}/>

      {error ? (<div className="shell">
          <p className="notice">
            <span aria-hidden="true">⚠</span>
            <span>{error}</span>
          </p>
        </div>) : null}

      {detail ? (<TitleModal item={detail} region={params.region} mine={params.providers} autoplayTrailer={autoplayTrailer} onClose={() => setDetail(null)}/>) : null}
    </>);
}
