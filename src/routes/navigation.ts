import { writable } from "svelte/store";

// Current view of the reputation app. The header (App.svelte) renders the
// navigation and ReputationApp.svelte renders the view, so both read this store.
export type Page =
    | "intro"
    | "graph"
    | "create"
    | "search"
    | "types"
    | "settings"
    | "profile";

export const currentPage = writable<Page>("intro");

export const navItems: { page: Page; label: string; icon: string; beta?: boolean }[] = [
    { page: "profile", label: "Profile", icon: "fa-user-circle" },
    { page: "types", label: "Types", icon: "fa-tags" },
    { page: "graph", label: "Graph", icon: "fa-project-diagram", beta: true },
    { page: "search", label: "Search", icon: "fa-search", beta: true },
    { page: "create", label: "Submit", icon: "fa-plus-circle", beta: true },
    { page: "settings", label: "Settings", icon: "fa-sliders-h" },
];
