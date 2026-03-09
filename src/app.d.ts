// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

// Treat .es files as text modules
declare module '*.es' {
	const content: string;
	export default content;
}

export {};
