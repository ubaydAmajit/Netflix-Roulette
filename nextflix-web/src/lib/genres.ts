const SHORT_FORMS: Record<string, string> = {
    "Science Fiction": "Sci-Fi",
    "Action & Adventure": "Action",
    "Sci-Fi & Fantasy": "Sci-Fi",
    "War & Politics": "War",
    Documentary: "Docs",
    Animation: "Animated",
    "TV Movie": "TV Film",
};
const MAX_LABEL = 11;
export function shortGenre(name: string): string {
    const short = SHORT_FORMS[name] ?? name;
    return short.length > MAX_LABEL ? `${short.slice(0, MAX_LABEL - 1)}…` : short;
}
export function wheelHue(index: number, count: number): number {
    return Math.round((index * 360) / Math.max(count, 1));
}
export function genreHue(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) % 360;
    }
    return Math.round((hash * 137.508) % 360);
}
export function sampleGenres(names: string[], count: number): string[] {
    const pool = [...names];
    const picked: string[] = [];
    const usedLabels = new Set<string>();
    while (picked.length < count && pool.length > 0) {
        const [name] = pool.splice(Math.floor(Math.random() * pool.length), 1);
        const label = shortGenre(name);
        if (usedLabels.has(label))
            continue;
        usedLabels.add(label);
        picked.push(name);
    }
    return picked;
}
