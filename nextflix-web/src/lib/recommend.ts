import "server-only";
import { samplePool } from "./search";
import { scoreAll, weightedPick } from "./scoring";
import type { GenreOption, Recommendation, SearchParams } from "./types";
const REEL_SIZE = 16;
export type Spin = {
    pick: Recommendation;
    reel: Recommendation[];
};
export async function recommend(params: SearchParams, genreIndex: GenreOption[], exclude: string[] = []): Promise<Spin | null> {
    const pool = await samplePool(params, genreIndex);
    const excluded = new Set(exclude);
    const candidates = pool
        .filter((item) => !excluded.has(item.key))
        .map((item) => ({
        item,
        rated: { voteAverage: item.voteAverage, voteCount: item.voteCount },
    }));
    const winner = weightedPick(scoreAll(candidates));
    if (!winner)
        return null;
    const reel = pool
        .filter((item) => item.posterUrl && item.key !== winner.item.key)
        .slice(0, REEL_SIZE);
    return { pick: winner.item, reel };
}
