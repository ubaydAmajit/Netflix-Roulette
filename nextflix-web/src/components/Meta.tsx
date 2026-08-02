import type { Recommendation } from "@/lib/types";
export function formatVotes(count: number): string {
    if (count >= 1000000)
        return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    if (count >= 1000)
        return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return String(count);
}
export default function Meta({ item, detailed = false, }: {
    item: Recommendation;
    detailed?: boolean;
}) {
    return (<>
      {item.voteAverage > 0 ? (<span className="pill is-score">★ {item.voteAverage.toFixed(1)}</span>) : null}
      <span className="pill is-type">{item.mediaType === "tv" ? "Series" : "Film"}</span>
      {item.year ? <span className="pill">{item.year}</span> : null}
      {detailed && item.voteCount > 0 ? (<span className="pill">{formatVotes(item.voteCount)} votes</span>) : null}
      {item.genres.slice(0, detailed ? 3 : 2).map((genre) => (<span className="pill" key={genre}>
          {genre}
        </span>))}
    </>);
}
