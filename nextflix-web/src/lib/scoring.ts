export const PRIOR_VOTES = 300;
export const BIAS_EXPONENT = 3;
export type Rated = {
    voteAverage: number;
    voteCount: number;
};
export function bayesianScore(item: Rated, poolMean: number, prior: number = PRIOR_VOTES): number {
    const v = Math.max(0, item.voteCount);
    return (v / (v + prior)) * item.voteAverage + (prior / (v + prior)) * poolMean;
}
export function poolMean(items: Rated[]): number {
    if (items.length === 0)
        return 0;
    return items.reduce((sum, item) => sum + item.voteAverage, 0) / items.length;
}
export function scoreAll<T extends {
    rated: Rated;
}>(items: T[]): Array<T & {
    score: number;
}> {
    const rated = items.filter((item) => item.rated.voteCount > 0);
    if (rated.length === 0)
        return [];
    const mean = poolMean(rated.map((item) => item.rated));
    return rated.map((item) => ({ ...item, score: bayesianScore(item.rated, mean) }));
}
export function weightedPick<T extends {
    score: number;
}>(items: T[], exponent: number = BIAS_EXPONENT, random: () => number = Math.random): T | null {
    if (items.length === 0)
        return null;
    const weights = items.map((item) => Math.pow(Math.max(0, item.score), exponent));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (!Number.isFinite(total) || total <= 0) {
        return items[Math.floor(random() * items.length)] ?? items[items.length - 1];
    }
    let threshold = random() * total;
    for (let i = 0; i < items.length; i += 1) {
        threshold -= weights[i];
        if (threshold <= 0)
            return items[i];
    }
    return items[items.length - 1];
}
