"use client";
import type { CSSProperties } from "react";
import type { Recommendation } from "@/lib/types";
type Props = {
    item: Recommendation;
    index: number;
    isPicked: boolean;
    onSelect: (item: Recommendation) => void;
};
export default function PosterCard({ item, index, isPicked, onSelect }: Props) {
    return (<button type="button" className={`card${isPicked ? " is-picked" : ""}`} onClick={() => onSelect(item)} style={{ "--i": index } as CSSProperties} aria-label={`${item.title}${item.year ? `, ${item.year}` : ""}`}>
      <span className="card-art">
        {item.posterUrl ? (<img src={item.posterUrl} alt="" loading="lazy" decoding="async"/>) : (<span className="noart" aria-hidden="true">
            🎬
          </span>)}

        {item.voteAverage > 0 ? (<span className="card-badge">★ {item.voteAverage.toFixed(1)}</span>) : null}

        <span className="card-veil">
          <span className="veil-genres">
            {item.genres.slice(0, 3).join(" · ") ||
            (item.mediaType === "tv" ? "Series" : "Film")}
          </span>
        </span>
      </span>

      <span className="card-title">{item.title}</span>
      <span className="card-sub">
        {[item.mediaType === "tv" ? "Series" : "Film", item.year].filter(Boolean).join(" · ")}
      </span>
    </button>);
}
