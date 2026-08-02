"use client";
import type { Choice, GenreOption, Provider, SearchParams } from "@/lib/types";
import ProviderPicker from "./ProviderPicker";
const RATINGS = Array.from({ length: 10 }, (_, index) => String(index + 1));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, index) => String(CURRENT_YEAR - index));
const MEDIA: Choice[] = [
    { value: "any", label: "Anything" },
    { value: "movie", label: "Films" },
    { value: "tv", label: "Series" },
];
const RUNTIMES: Choice[] = [
    { value: "", label: "Any length" },
    { value: "short", label: "Under 90 min" },
    { value: "medium", label: "90–120 min" },
    { value: "long", label: "Over 120 min" },
];
const SORTS: Choice[] = [
    { value: "popularity", label: "Most popular" },
    { value: "rating", label: "Highest rated" },
    { value: "newest", label: "Newest first" },
];
const COUNTED: Array<keyof SearchParams> = [
    "genre",
    "minRating",
    "maxRating",
    "minYear",
    "maxYear",
    "runtime",
    "language",
];
export function countActive(params: SearchParams): number {
    const base = COUNTED.filter((field) => params[field] !== "").length;
    return base + (params.mediaFilter !== "any" ? 1 : 0);
}
type Props = {
    params: SearchParams;
    genres: GenreOption[];
    regions: Choice[];
    languages: Choice[];
    providers: Provider[];
    providersLoading: boolean;
    disabled: boolean;
    onChange: <K extends keyof SearchParams>(field: K, value: SearchParams[K]) => void;
    onRegionChange: (region: string) => void;
    onToggleProvider: (id: string) => void;
    onSelectAllProviders: () => void;
    onApply: () => void;
    onReset: () => void;
};
export default function Filters({ params, genres, regions, languages, providers, providersLoading, disabled, onChange, onRegionChange, onToggleProvider, onSelectAllProviders, onApply, onReset, }: Props) {
    const searching = params.query.trim().length > 0;
    const active = countActive(params);
    return (<div className="filters" id="filters">
      <ProviderPicker providers={providers} selected={params.providers} loading={providersLoading} onToggle={onToggleProvider} onSelectAll={onSelectAllProviders}/>

      <div className="filter-grid">
        <Field label="Type" id="mediaFilter">
          <select id="mediaFilter" value={params.mediaFilter} onChange={(event) => onChange("mediaFilter", event.target.value as SearchParams["mediaFilter"])}>
            {MEDIA.map((choice) => (<option key={choice.value} value={choice.value}>
                {choice.label}
              </option>))}
          </select>
        </Field>

        <Field label="Genre" id="genre">
          <select id="genre" value={params.genre} onChange={(event) => onChange("genre", event.target.value)}>
            <option value="">Any genre</option>
            {genres.map((genre) => (<option key={genre.value} value={genre.value}>
                {genre.label}
              </option>))}
          </select>
        </Field>

        <Field label="Rating from" id="minRating">
          <select id="minRating" value={params.minRating} onChange={(event) => onChange("minRating", event.target.value)}>
            <option value="">Any</option>
            {RATINGS.map((rating) => (<option key={rating} value={rating}>
                {rating}+
              </option>))}
          </select>
        </Field>

        <Field label="Rating to" id="maxRating">
          <select id="maxRating" value={params.maxRating} onChange={(event) => onChange("maxRating", event.target.value)}>
            <option value="">Any</option>
            {RATINGS.map((rating) => (<option key={rating} value={rating}>
                {rating}
              </option>))}
          </select>
        </Field>

        <Field label="Year from" id="minYear">
          <select id="minYear" value={params.minYear} onChange={(event) => onChange("minYear", event.target.value)}>
            <option value="">Any</option>
            {YEARS.map((year) => (<option key={year} value={year}>
                {year}
              </option>))}
          </select>
        </Field>

        <Field label="Year to" id="maxYear">
          <select id="maxYear" value={params.maxYear} onChange={(event) => onChange("maxYear", event.target.value)}>
            <option value="">Any</option>
            {YEARS.map((year) => (<option key={year} value={year}>
                {year}
              </option>))}
          </select>
        </Field>

        <Field label="Length" id="runtime" hint={searching ? "Browse only" : undefined}>
          <select id="runtime" value={params.runtime} onChange={(event) => onChange("runtime", event.target.value as SearchParams["runtime"])} disabled={searching} title={searching ? "Runtime isn't available on search results" : undefined}>
            {RUNTIMES.map((choice) => (<option key={choice.value} value={choice.value}>
                {choice.label}
              </option>))}
          </select>
        </Field>

        <Field label="Language" id="language">
          <select id="language" value={params.language} onChange={(event) => onChange("language", event.target.value)}>
            <option value="">Any language</option>
            {languages.map((language) => (<option key={language.value} value={language.value}>
                {language.label}
              </option>))}
          </select>
        </Field>

        <Field label="Sort" id="sort" hint={searching ? "By relevance" : undefined}>
          <select id="sort" value={params.sort} onChange={(event) => onChange("sort", event.target.value as SearchParams["sort"])} disabled={searching} title={searching ? "Text search is ordered by relevance" : undefined}>
            {SORTS.map((choice) => (<option key={choice.value} value={choice.value}>
                {choice.label}
              </option>))}
          </select>
        </Field>

        <Field label="Region" id="region">
          <select id="region" value={params.region} onChange={(event) => onRegionChange(event.target.value)}>
            {regions.map((region) => (<option key={region.value} value={region.value}>
                {region.label}
              </option>))}
          </select>
        </Field>
      </div>

      <div className="filter-foot">
        <span className="count">
          {active === 0
            ? "No filters applied"
            : `${active} filter${active === 1 ? "" : "s"} applied`}
        </span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost" onClick={onReset} disabled={disabled || active === 0}>
            Clear all
          </button>
          <button type="button" className="btn btn-primary" onClick={onApply} disabled={disabled}>
            Apply
          </button>
        </div>
      </div>
    </div>);
}
function Field({ label, id, hint, children, }: {
    label: string;
    id: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (<div className="field">
      <label htmlFor={id}>
        {label}
        {hint ? ` · ${hint}` : ""}
      </label>
      {children}
    </div>);
}
