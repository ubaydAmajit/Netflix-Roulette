"use client";
import Link from "next/link";
import { genreHue } from "@/lib/genres";
import type { GenreOption, Recommendation, WheelMode, WheelSegment } from "@/lib/types";
import GenrePicker from "./GenrePicker";
import Meta from "./Meta";
import SpinWheel from "./SpinWheel";
type Props = {
    pick: Recommendation | null;
    segments: WheelSegment[];
    spinToken: number;
    abortToken: number;
    pendingSegment: WheelSegment | null;
    isSpinning: boolean;
    serviceSummary: string;
    mode: WheelMode;
    onModeChange: (mode: WheelMode) => void;
    genres: GenreOption[];
    genre: string;
    onGenreChange: (genre: string) => void;
    wheelGenres: string[];
    genreCount: number;
    maxWheelGenres: number;
    pickerOpen: boolean;
    onTogglePicker: () => void;
    onGenreCountChange: (count: number) => void;
    onToggleWheelGenre: (name: string) => void;
    onRandomiseGenres: () => void;
    wonGenre: string | null;
    onUseGenre: () => void;
    poolLoading: boolean;
    onSpin: () => void;
    onLanded: () => void;
    onSelectSegment: (segment: WheelSegment) => void;
    onDetails: (item: Recommendation) => void;
    hasTrailer: boolean;
    onPlayTrailer: () => void;
};
/** Hero section for the roulette UI and selection summary. */
export default function Hero({ pick, segments, spinToken, abortToken, pendingSegment, isSpinning, serviceSummary, mode, onModeChange, genres, genre, onGenreChange, wheelGenres, genreCount, maxWheelGenres, pickerOpen, onTogglePicker, onGenreCountChange, onToggleWheelGenre, onRandomiseGenres, wonGenre, onUseGenre, poolLoading, onSpin, onLanded, onSelectSegment, onDetails, hasTrailer, onPlayTrailer, }: Props) {
    const showResult = mode === "titles" && pick !== null;
    return (<section className={`stage ${showResult ? "is-result" : "is-intro"}`}>
      {showResult && pick?.backdropUrl ? (<div className="hero-bg" style={{ backgroundImage: `url(${pick.backdropUrl})` }} aria-hidden="true" key={pick.key}/>) : null}

      <div className="stage-split">
        <div className="stage-wheel">
          
          <div className="mode-toggle" role="group" aria-label="What to spin for">
            {(["titles", "genres"] as const).map((option) => (<button type="button" key={option} className={`mode-btn${mode === option ? " is-on" : ""}`} onClick={() => onModeChange(option)} disabled={isSpinning} aria-pressed={mode === option}>
                {option === "titles" ? "Titles" : "Genres"}
              </button>))}
          </div>

          <SpinWheel segments={segments} spinToken={spinToken} abortToken={abortToken} winner={pendingSegment} onLanded={onLanded} onSpin={onSpin} isSpinning={isSpinning} onSelect={onSelectSegment}/>

          {mode === "genres" ? (<GenrePicker genres={genres} selected={wheelGenres} count={genreCount} max={maxWheelGenres} open={pickerOpen} onToggleOpen={onTogglePicker} onCountChange={onGenreCountChange} onToggleGenre={onToggleWheelGenre} onRandomise={onRandomiseGenres}/>) : (<div className="stage-genre">
              <label htmlFor="spin-genre" className="sr-only">
                Genre
              </label>
              <select id="spin-genre" value={genre} onChange={(event) => onGenreChange(event.target.value)} disabled={isSpinning}>
                <option value="">Any genre</option>
                {genres.map((option) => (<option key={option.value} value={option.value}>
                    {option.label}
                  </option>))}
              </select>
              {poolLoading ? <span className="spinner" aria-label="Updating wheel"/> : null}
            </div>)}

          <p className="stage-services">
            {serviceSummary}
            
            <Link href="/browse" className="linkish">
              Change
            </Link>
          </p>
        </div>

        <div className="stage-right">
          {mode === "genres" ? (wonGenre ? (<div className="stage-genre-win fade-up" key={wonGenre}>
                <p className="hero-eyebrow">The wheel says</p>
                <h1 style={{ color: `hsl(${genreHue(wonGenre)} 70% 66%)` }}>{wonGenre}</h1>
                <p className="tagline">
                  Now spin again to find something to watch inside it.
                </p>
                <div className="hero-actions">
                  <button type="button" className="btn btn-primary btn-lg" onClick={onUseGenre}>
                    Spin for a {wonGenre} pick
                  </button>
                </div>
              </div>) : (<div className="stage-brand fade-up">
                <h1 className="stage-title">Can&apos;t pick a genre either?</h1>
                <p className="tagline">
                  Spin the wheel and let it choose one, then spin again inside it.
                </p>
              </div>)) : pick ? (<div className="stage-detail" key={pick.key}>
              {genre ? <p className="hero-eyebrow">{genre}</p> : null}
              <h1>{pick.title}</h1>

              <div className="hero-meta">
                <Meta item={pick}/>
              </div>

              {pick.synopsis ? <p className="synopsis">{pick.synopsis}</p> : null}

              <div className="hero-actions">
                {hasTrailer ? (<button type="button" className="btn btn-primary" onClick={onPlayTrailer}>
                    <span aria-hidden="true">▶</span> Trailer
                  </button>) : null}
                <button type="button" className="btn btn-light" onClick={() => onDetails(pick)}>
                  More info
                </button>
                {genre ? (<button type="button" className="btn btn-ghost" onClick={() => onGenreChange("")}>
                    Clear {genre}
                  </button>) : null}
              </div>
            </div>) : (<div className="stage-brand fade-up">
              
              <img src="/nextflix_title-removebg.png" alt="NextFlix" className="stage-wordmark"/>
              <p className="tagline">Can&apos;t decide? Give it a spin.</p>
            </div>)}
        </div>
      </div>
    </section>);
}
