"use client";
import type { GenreOption } from "@/lib/types";
export const GENRE_COUNTS = [4, 6, 8, 10, 12];
type Props = {
    genres: GenreOption[];
    selected: string[];
    count: number;
    max: number;
    open: boolean;
    onToggleOpen: () => void;
    onCountChange: (count: number) => void;
    onToggleGenre: (name: string) => void;
    onRandomise: () => void;
};
export default function GenrePicker({ genres, selected, count, max, open, onToggleOpen, onCountChange, onToggleGenre, onRandomise, }: Props) {
    const onWheel = Math.min(selected.length, max);
    const overflow = selected.length - onWheel;
    return (<div className="genre-config">
      <div className="genre-config-row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRandomise}>
          Randomise
        </button>
        <select aria-label="How many genres to randomise" value={count} onChange={(event) => onCountChange(Number(event.target.value))}>
          {GENRE_COUNTS.map((option) => (<option key={option} value={option}>
              {option} genres
            </option>))}
        </select>

        <button type="button" className="btn btn-ghost btn-sm" onClick={onToggleOpen} aria-expanded={open} aria-controls="genre-choices">
          {open ? "Done" : "Choose"}
        </button>
      </div>

      <p className="genre-status">
        {onWheel < 2
            ? "Add at least two genres to spin."
            : `${onWheel} genres on the wheel`}
        {overflow > 0 ? ` · ${overflow} over the limit of ${max}` : ""}
      </p>

      {open ? (<div className="genre-choices" id="genre-choices">
          <div className="genre-chips">
            {genres.map((genre) => {
                const on = selected.includes(genre.value);
                return (<button type="button" key={genre.value} className={`genre-chip${on ? " is-on" : ""}`} onClick={() => onToggleGenre(genre.value)} aria-pressed={on}>
                  {genre.label}
                </button>);
            })}
          </div>
        </div>) : null}
    </div>);
}
