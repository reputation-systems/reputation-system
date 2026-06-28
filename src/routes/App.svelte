<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { get } from "svelte/store";

    import Theme from "./Theme.svelte";
    import ReputationApp from "./ReputationApp.svelte";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import SettingsModal from "$lib/components/SettingsModal.svelte";

    // Template wallet system (source of truth for the visible connect UI).
    import {
        WalletButton,
        WalletAddressChangeHandler,
        walletAddress,
        walletConnected,
    } from "wallet-svelte-component";
    import { web_explorer_uri_addr } from "$lib/common/store";

    // Reputation-system's own stores — every existing reputation view/flow
    // reads connection state from HERE, so the wallet bridge below keeps them
    // in sync with the template WalletButton.
    import { connected, address, network } from "$lib/store";

    // --- Footer state ---
    let current_height: number | null = null;
    let scrollingTextElement: HTMLElement;
    const footerMessages = [
        "This app is a fully decentralized application. It runs locally in your browser.",
        "Your keys never leave your wallet. You are in full control of your assets.",
        "Reputation lives on-chain — verifiable, atomic, and powered by the Ergo Blockchain.",
    ];
    let activeMessageIndex = 0;
    function handleAnimationIteration() {
        activeMessageIndex = (activeMessageIndex + 1) % footerMessages.length;
    }

    // --- Settings modal ---
    let showSettingsModal = false;

    // --- KYA (Know Your Assumptions) ---
    let showKyaModal = false;
    let isKyaButtonEnabled = false;
    let kyaContentDiv: HTMLDivElement;

    function checkKyaScroll(e: Event) {
        const el = e.target as HTMLDivElement;
        if (Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 5) {
            isKyaButtonEnabled = true;
        }
    }
    function handleOpenKyaModal() {
        showKyaModal = true;
        isKyaButtonEnabled = false;
        setTimeout(() => {
            if (kyaContentDiv && kyaContentDiv.scrollHeight <= kyaContentDiv.clientHeight) {
                isKyaButtonEnabled = true;
            }
        }, 0);
    }
    function handleCloseKyaModal() {
        showKyaModal = false;
        if (browser) localStorage.setItem("acceptedReputationKYA", "true");
    }

    async function get_current_height(): Promise<number | null> {
        // Prefer the connected wallet, fall back to the public Ergo API.
        try {
            // @ts-ignore - `ergo` is injected by the wallet (Nautilus) dApp connector
            if (typeof ergo !== "undefined") return await ergo.get_current_height();
        } catch (_) { /* fall through */ }
        try {
            const r = await fetch("https://api.ergoplatform.com/api/v1/networkState");
            if (r.ok) return (await r.json()).height;
        } catch (_) { /* ignore */ }
        return null;
    }

    // --- Wallet bridge: template WalletButton -> reputation `$lib/store` ---
    // Existing reputation logic depends on the `ergo` global (injected by the
    // wallet on connect) plus `connected`/`address`/`network`. We mirror the
    // template's App.svelte sync pattern, but write into reputation's stores.
    walletConnected.subscribe(async (isConnected) => {
        if (!browser) return;
        if (isConnected) {
            let addr = get(walletAddress);
            try {
                // @ts-ignore
                if (!addr && typeof ergo !== "undefined") addr = await ergo.get_change_address();
            } catch (_) { /* ignore */ }
            address.set(addr ?? null);
            network.set("ergo");
            connected.set(true);
            current_height = await get_current_height();
        } else {
            address.set(null);
            network.set(null);
            connected.set(false);
        }
    });

    onMount(() => {
        if (!browser) return;
        const accepted = localStorage.getItem("acceptedReputationKYA") === "true";
        if (!accepted) handleOpenKyaModal();
        // async work fired-and-forgotten so onMount can return a sync cleanup
        get_current_height().then((h) => (current_height = h));
        scrollingTextElement?.addEventListener("animationiteration", handleAnimationIteration);
        return () => {
            scrollingTextElement?.removeEventListener("animationiteration", handleAnimationIteration);
        };
    });
</script>

<header class="navbar-container">
    <div class="navbar-content">
        <a href="#" class="logo-container">Reputation System</a>

        <div class="flex-1"></div>

        <div class="user-section">
            <!-- Header connect-wallet is hidden: the single connect entry point
                 is the center button on the intro page (it opens the wallet
                 extension-selection modal). Once connected, we still surface the
                 WalletButton here so the account/address/disconnect dropdown
                 stays reachable from the navbar. -->
            {#if $walletConnected}
                <WalletButton explorerUrl={$web_explorer_uri_addr} />
            {/if}
            <button
                class="settings-button"
                on:click={() => (showSettingsModal = true)}
                aria-label="Settings"
                title="Settings"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                    />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </button>
            <div class="theme-toggle">
                <Theme />
            </div>
        </div>
    </div>
</header>

<Dialog.Root bind:open={showKyaModal}>
    <Dialog.Content class="w-[700px] max-w-[85vw] sm:max-w-[70vw]">
        <Dialog.Header>
            <Dialog.Title>Know Your Assumptions - Sigma Reputation</Dialog.Title>
        </Dialog.Header>
        <div
            bind:this={kyaContentDiv}
            on:scroll={checkKyaScroll}
            class="max-h-[50vh] overflow-y-auto pr-4 text-sm"
        >
            <p class="mb-3">
                This application operates locally in your browser, does not rely
                on any centralized server, and interacts directly with the Ergo
                blockchain through your wallet to read and build reputation proofs.
            </p>

            <h3 class="font-bold text-md mt-4 mb-2">Fundamental Assumptions</h3>
            <ul class="list-disc ml-6 space-y-2">
                <li>
                    <strong>Wallet Compatibility:</strong> It is assumed that you
                    have a Nautilus-compatible wallet installed, configured, and
                    unlocked. The application depends on your wallet to sign and
                    submit reputation transactions.
                </li>
                <li>
                    <strong>Direct Blockchain Interaction:</strong> This tool runs
                    entirely on your machine. All reputation operations are
                    transactions you must sign and that are sent directly to the
                    Ergo network. There are no intermediary servers.
                </li>
                <li>
                    <strong>User Responsibility:</strong> You are responsible for
                    the information you input and the assets you sacrifice to back
                    a reputation claim. Transactions on the blockchain are irreversible.
                </li>
                <li>
                    <strong>Network Fees:</strong> It is assumed that you have
                    enough ERG to cover network fees and the minimum value needed
                    to create reputation boxes. Without this, transactions will fail.
                </li>
            </ul>

            <h3 class="font-bold text-md mt-4 mb-2">Risks and Disclaimers</h3>
            <ul class="list-disc ml-6 space-y-2">
                <li>
                    <strong>"As-Is" Software:</strong> This tool is provided "as
                    is", without warranties of any kind. Use it at your own risk.
                </li>
                <li>
                    <strong>Irreversible Transactions:</strong> Once you sign and
                    submit a reputation proof or asset sacrifice, it cannot be
                    undone. Double-check all parameters before confirming.
                </li>
                <li>
                    <strong>Wallet Security:</strong> You are solely responsible
                    for the security of your wallet, private keys, and assets.
                    This application never has access to your keys.
                </li>
                <li>
                    <strong>No Central Authority:</strong> As a decentralized tool,
                    there is no central entity to appeal to for lost funds or failed
                    transactions. You interact directly with a permissionless chain.
                </li>
            </ul>
            <p class="italic mt-6">
                Do you understand and accept these assumptions and the associated
                risks of using this tool?
            </p>
        </div>
        <Dialog.Footer class="mt-4">
            <Button
                on:click={handleCloseKyaModal}
                disabled={!isKyaButtonEnabled}
                class="w-full sm:w-auto"
            >
                I Understand and Accept
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Reputation app body (intro + graph/create/search/types/settings/profile) -->
<ReputationApp />

<footer class="page-footer">
    <div class="footer-left">
        <span
            class="cursor-pointer hover:underline"
            on:click={handleOpenKyaModal}
            on:keydown={(e) => e.key === "Enter" && handleOpenKyaModal()}
            role="button"
            tabindex="0"
        >
            KYA
        </span>
    </div>

    <div class="footer-center">
        <div bind:this={scrollingTextElement} class="scrolling-text-wrapper">
            {footerMessages[activeMessageIndex]}
        </div>
    </div>

    <div class="footer-right">
        <svg
            width="14"
            height="14"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            ><path
                d="M0.502 2.999L6 0L11.495 3.03L6.0025 5.96L0.502 2.999V2.999ZM6.5 6.8365V12L11.5 9.319V4.156L6.5 6.8365V6.8365ZM5.5 6.8365L0.5 4.131V9.319L5.5 12V6.8365Z"
                fill="currentColor"
            ></path></svg
        >
        {#if current_height}
            <span>{current_height}</span>
        {/if}
    </div>
</footer>

<!-- Wallet Address Change Handler -->
<WalletAddressChangeHandler />

<!-- Settings Modal -->
<SettingsModal bind:open={showSettingsModal} />

<style lang="postcss">
    :global(body) {
        background-color: hsl(var(--background));
    }

    .navbar-container {
        @apply sticky top-0 z-50 w-full border-b backdrop-blur-lg;
        background-color: hsl(var(--background) / 0.8);
        border-bottom-color: hsl(var(--border));
    }

    .navbar-content {
        @apply container flex h-16 items-center;
    }

    .logo-container {
        @apply mr-4 flex items-center;
        font-family: var(--font-heading);
        font-weight: 700;
        font-size: 1.15rem;
        text-decoration: none;
        color: hsl(var(--foreground));
    }

    .user-section {
        @apply flex items-center gap-4;
    }

    .settings-button {
        @apply flex items-center justify-center;
        @apply w-9 h-9 rounded-md;
        @apply border border-border;
        @apply bg-background hover:bg-accent;
        @apply text-foreground hover:text-accent-foreground;
        @apply transition-colors cursor-pointer;
    }

    .settings-button:hover {
        @apply shadow-sm;
    }

    .page-footer {
        @apply fixed bottom-0 left-0 right-0 z-40;
        @apply flex items-center;
        @apply h-12 px-6 gap-6;
        @apply border-t text-sm text-muted-foreground;
        background-color: hsl(var(--background) / 0.8);
        border-top-color: hsl(var(--border));
        backdrop-filter: blur(4px);
    }

    .footer-left,
    .footer-right {
        @apply flex items-center gap-2 flex-shrink-0;
    }

    .footer-center {
        @apply flex-1 overflow-hidden;
        -webkit-mask-image: linear-gradient(
            to right,
            transparent,
            black 10%,
            black 90%,
            transparent
        );
        mask-image: linear-gradient(
            to right,
            transparent,
            black 10%,
            black 90%,
            transparent
        );
    }

    .scrolling-text-wrapper {
        @apply inline-block whitespace-nowrap;
        animation: scroll-left 30s linear infinite;
    }

    @keyframes scroll-left {
        from {
            transform: translateX(100vw);
        }
        to {
            transform: translateX(-100%);
        }
    }
</style>
