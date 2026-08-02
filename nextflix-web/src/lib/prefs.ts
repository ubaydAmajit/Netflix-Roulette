const STORAGE_KEY = "nextflix:prefs:v1";
export type StoredPrefs = {
    region?: string;
    providers?: string[];
};
export function readPrefs(): StoredPrefs {
    if (typeof window === "undefined")
        return {};
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredPrefs;
    }
    catch {
        return {};
    }
}
export function writePrefs(prefs: StoredPrefs) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
    catch {
    }
}
