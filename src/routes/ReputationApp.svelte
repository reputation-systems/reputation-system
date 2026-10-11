<script lang="ts">
    // app.css is imported once in +layout.svelte (template shell owns it).
    import { browser } from "$app/environment";
    import { onMount } from "svelte";
    import { fetchAllUserProfiles } from "$lib/profileFetch";
    // Template wallet system: the center "Connect Wallet" button opens the
    // extension-selection modal (Nautilus / SAFEW / …) from wallet-svelte-component.
    // The App.svelte shell bridges its `walletConnected` into reputation's own
    // `connected`/`address`/`network` stores, so every existing flow keeps working.
    import { WalletModal, walletManager } from "wallet-svelte-component";
    import {
        connected,
        reputation_proof,
        user_profiles,
        proofs,
        types,
        address,
        network,
        fetch_all,
        compute_deep_level,
        explorer_uri,
    } from "$lib/store";
    import {
        updateReputationProofList,
        fetchTypeNfts,
    } from "$lib/fetch";
    import MasterGraphView from "$components/graph/MasterGraphView.svelte";
    import Submit from "$components/views/Submit.svelte";
    import Search from "$components/views/Search.svelte";
    import Settings from "$components/views/Settings.svelte";
    import ManageTypes from "$components/views/ManageTypes.svelte";
    import { Profile } from "$lib";
    import { Button } from "$lib/components/ui/button/index.js";
    import { base } from "$app/paths";
    import { currentPage } from "./navigation";

    const educationalPhrases = [
        "Reputation is the foundation of trust in a decentralized world; build yours through verifiable commitment.",
        "Don't rely on a single profile; a robust reputation is built across multiple facets and verified types.",
        "Increase your reputation by sacrificing assets to demonstrate you have real skin in the game.",
        "Create automated services or robots that perform tasks and earn their own verifiable reputation on-chain.",
        "Your profile is a self-referencing proof that anchors all your digital assertions and trust relationships.",
        "Sacrificed assets are permanent commitments that give weight and responsibility to your reputation claims.",
        "Reputation boxes are modular; you can expand your trust network one atomic and transparent proof at a time.",
        "Types are public standards that ensure everyone understands the meaning and rules of your reputation data.",
        "A multi-faceted reputation is more resilient than a single score; diversify your proofs to build deeper trust.",
    ];

    const implementingApps = [
        {
            name: "Forum",
            description:
                "Decentralized Forum application built on the Ergo blockchain. Allows users to create profiles, post discussions, and flag spam on-chain.",
            icon: "fa-comments",
            color: "#8b5cf6",
            url: "https://reputation-systems.github.io/forum-application/",
        },
        {
            name: "Source",
            description:
                "Hash-based file discovery application. A decentralized directory mapping file hashes to download sources like URLs, IPFS, and Magnet links.",
            icon: "fa-file-code",
            color: "#10b981",
            url: "https://reputation-systems.github.io/source-application/",
        },
        {
            name: "Bene",
            description:
                "Proof-of-Funding fundraising platform. Uses smart contracts to ensure projects only access funds if they meet predefined goals.",
            icon: "fa-hand-holding-heart",
            color: "orange",
            url: "https://ergo.bene.stability.nexus/",
            image: "https://raw.githubusercontent.com/StabilityNexus/BenefactionPlatform-Ergo/main/static/favicon.png",
        },
        {
            name: "Game of Prompts",
            description:
                "Competitive platform where creators design game-services and players create solver-services to maximize scores on Ergo.",
            icon: "fa-robot",
            color: "#2B2C28",
            url: "https://game-of-prompts.github.io/",
            image: "https://avatars.githubusercontent.com/u/212117344?s=400&u=a83e1bcbe71929ecbfeed4c1ad0d4ec4b6647927&v=4",
        },
        {
            name: "Bounty",
            description:
                "Decentralized bounty platform built on the Ergo blockchain. Allows users to create profiles, post bounties, and claim rewards on-chain.",
            icon: "fa-bolt",
            color: "orange",
            url: "https://ergo.bounty.stability.nexus/",
            image: "https://raw.githubusercontent.com/StabilityNexus/Bountiful-BountyPlatform-Ergo/refs/heads/main/static/favicon.png",
        },
    ];

    let randomPhrase = "";
    let showWalletModal = false;
    let loadingProfiles = false;

    function openWalletModal() {
        showWalletModal = true;
        walletManager.openModal();
    }
    let lastLoadedExplorerUri = "";
    let wasConnected = false;

    onMount(async () => {
        randomPhrase =
            educationalPhrases[
                Math.floor(Math.random() * educationalPhrases.length)
            ];
    });

    $: if (browser && $explorer_uri && $explorer_uri !== lastLoadedExplorerUri) {
        lastLoadedExplorerUri = $explorer_uri;
        loadTypes();
        if ($connected) {
            loadProfile();
            loadProofs();
        }
    }

    $: if (browser && $connected && !wasConnected) {
        wasConnected = true;
        loadProfile();
        loadProofs();
    }

    $: if (!$connected && wasConnected) {
        wasConnected = false;
    }

    async function loadTypes() {
        const typesMap = await fetchTypeNfts($explorer_uri);
        types.set(typesMap);
    }

    async function loadProfile() {
        loadingProfiles = true;
        try {
            // A profile is any SELF opinion: a proof box whose R5 (object pointer)
            // equals its own token id (assets[0].tokenId), of ANY type. The profile's
            // type is read from R4 of that self opinion (see _buildReputationProofs),
            // not restricted to a single hardcoded PROFILE_TYPE_NFT_ID.
            const allProfiles = await fetchAllUserProfiles(
                $explorer_uri,
                true, // is_self_defined: only self-pointing proofs (R5 === tokenId)
                [], // types: no type restriction — any type qualifies
                $types,
            );
            user_profiles.set(allProfiles);
            if (allProfiles.length > 0) {
                reputation_proof.set(allProfiles[0]);
            } else {
                reputation_proof.set(null);
            }
        } finally {
            loadingProfiles = false;
        }
    }

    async function loadProofs() {
        // updateReputationProofList returns Map<string, ReputationProof>
        // We pass $connected and $types (value of store)
        const proofsMap = await updateReputationProofList(
            $explorer_uri,
            $connected,
            $types,
            null,
        );
        proofs.set(proofsMap);
    }

    function handleProfileRefresh() {
        loadProfile();
        loadProofs(); // Also refresh proofs as they might have changed
    }
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"
        integrity="sha512-KfkfwYDsLkIlwQp6LFnl8zNdLGxu9YAA1QvwINks4PhcElQSvqcyVLLD9aMhXd13uQjoXtEKNosOWaZqXgel0g=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
    />
</svelte:head>

<main>
    {#if $currentPage === "intro"}
        <div class="welcome-container" style="--hero-art: url('{base}/frame_52.png')">
            <p class="eyebrow">On-chain reputation · Ergo</p>
            <h1>Welcome to <span class="accent">Sigma Reputation</span></h1>

            {#if $connected}
                <div class="educational-phrase">
                    <p class="phrase-label">
                        <i class="fas fa-lightbulb" aria-hidden="true"></i> Did you know?
                    </p>
                    <p class="phrase-text">{randomPhrase}</p>
                </div>
                <Button size="lg" class="mt-8 h-12 gap-2 px-8 text-base font-semibold shadow-lg shadow-primary/20" on:click={() => currentPage.set("profile")}>
                    {#if loadingProfiles}
                        <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                        Loading your reputation…
                    {:else}
                        Explore your reputation
                        <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    {/if}
                </Button>
            {:else}
                <p class="lead">
                    Build verifiable, atomic reputation proofs and explore the
                    web of trust on Ergo — directly from your wallet.
                </p>
                <Button size="lg" class="mt-8 h-12 gap-2 px-8 text-base font-semibold shadow-lg shadow-primary/20" on:click={openWalletModal}>
                    <i class="fas fa-wallet" aria-hidden="true"></i>
                    Connect Wallet
                </Button>
                <p class="hint">Nautilus or SAFEW · runs locally in your browser</p>
            {/if}

            <div class="apps-carousel-container">
                <p class="carousel-title">Powered by Sigma Reputation</p>
                <div class="apps-carousel-track">
                    <!-- The list is doubled for a seamless loop; the copy is hidden
                         from assistive tech and the tab order. -->
                    {#each [...implementingApps, ...implementingApps] as app, i}
                        {@const isCopy = i >= implementingApps.length}
                        <a
                            aria-hidden={isCopy ? "true" : undefined}
                            tabindex={isCopy ? -1 : undefined}
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="app-card"
                            style="--app-color: {app.color}"
                        >
                            <div class="app-icon">
                                {#if app.image}
                                    <img src={app.image} alt="" loading="lazy" />
                                {:else}
                                    <i class="fas {app.icon}" aria-hidden="true"></i>
                                {/if}
                            </div>
                            <div class="app-info">
                                <h3>{app.name}</h3>
                                <p>{app.description}</p>
                            </div>
                        </a>
                    {/each}
                </div>
            </div>
        </div>
    {:else}
        <div class="view-content">
            {#if $currentPage === "graph"}
                <MasterGraphView />
            {:else if $currentPage === "search"}
                <Search
                    types={$types}
                    connected={$connected}
                    on:searchGraph={() => currentPage.set("graph")}
                />
            {:else if $currentPage === "create"}
                <div class="wizard-wrapper">
                    <Submit
                        proofs={$proofs}
                        connected={$connected}
                        types={$types}
                    />
                </div>
            {:else if $currentPage === "types"}
                <div class="wizard-wrapper">
                    <ManageTypes types={$types} on:refresh={loadTypes} />
                </div>
            {:else if $currentPage === "settings"}
                <Settings
                    address={$address}
                    network={$network}
                    bind:explorerUri={$explorer_uri}
                    bind:fetchAll={$fetch_all}
                    bind:computeDeepLevel={$compute_deep_level}
                />
            {:else if $currentPage === "profile"}
                <Profile
                    reputationProof={$reputation_proof}
                    userProfiles={$user_profiles}
                    connected={$connected}
                    explorer_uri={$explorer_uri}
                    on:refresh={handleProfileRefresh}
                    on:switchProfile={(e) => reputation_proof.set(e.detail)}
                />
            {/if}
        </div>
    {/if}
</main>

<!-- Wallet extension-selection modal (Nautilus / SAFEW / …), opened by the
     center "Connect Wallet" button on the intro page. -->
<WalletModal bind:open={showWalletModal} />

<style>
    :global(html, body) {
        height: auto;
        overflow-x: hidden;
        overflow-y: auto;
    }

    :global(body) {
        margin: 0;
    }

    main {
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
        /* viewport minus the sticky header; the bottom padding keeps content
           clear of the fixed footer (3rem). */
        min-height: calc(100vh - 4rem);
        padding-bottom: 3rem;
    }

    .welcome-container {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: calc(100vh - 7rem);
        text-align: center;
        padding: 3rem 1rem 1rem;
        box-sizing: border-box;
        overflow: hidden;
        isolation: isolate;
    }

    /* Amber glow + the sigma line art, kept faint so the copy stays legible. */
    .welcome-container::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
            radial-gradient(ellipse 60% 45% at 50% 30%, hsl(var(--primary) / 0.14), transparent 70%),
            var(--hero-art) no-repeat right -8rem center / min(46rem, 80vw);
        opacity: 0.9;
    }

    :global(html:not(.dark)) .welcome-container::before {
        background:
            radial-gradient(ellipse 60% 45% at 50% 30%, hsl(var(--primary) / 0.18), transparent 70%);
    }

    .eyebrow {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        margin: 0 0 1rem;
    }

    .welcome-container h1 {
        font-size: clamp(2.25rem, 6vw, 3.75rem);
        line-height: 1.05;
        font-weight: 800;
        letter-spacing: -0.035em;
        max-width: 18ch;
        margin: 0;
    }

    .welcome-container h1 .accent {
        color: hsl(var(--primary));
    }

    :global(html:not(.dark)) .welcome-container h1 .accent {
        /* #fbbf24 on near-white fails contrast; use a deeper amber in light mode */
        color: #b45309;
    }

    .lead {
        margin: 1.25rem 0 0;
        max-width: 36rem;
        font-size: clamp(1rem, 2.2vw, 1.15rem);
        line-height: 1.6;
        color: hsl(var(--muted-foreground));
    }

    .hint {
        margin: 0.9rem 0 0;
        font-size: 0.8rem;
        color: hsl(var(--muted-foreground));
    }

    .educational-phrase {
        background: hsl(var(--primary) / 0.08);
        border: 1px solid hsl(var(--primary) / 0.3);
        padding: 1.25rem 1.5rem;
        border-radius: 12px;
        margin: 2rem 0 0;
        max-width: 32rem;
        text-align: left;
    }

    .phrase-label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: hsl(var(--primary));
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.75rem;
        margin: 0 0 0.5rem;
        letter-spacing: 0.08em;
    }

    :global(html:not(.dark)) .phrase-label {
        color: #b45309;
    }

    .phrase-text {
        font-size: 1.05rem;
        line-height: 1.5;
        color: hsl(var(--foreground));
        margin: 0;
    }

    .wizard-wrapper {
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
        width: 100%;
        box-sizing: border-box;
    }

    /* Let the view shrink below its content width instead of overflowing. */
    .wizard-wrapper > :global(*) {
        min-width: 0;
    }

    /* Carousel Styles */
    .apps-carousel-container {
        margin-top: 4rem;
        width: 100%;
        max-width: 100vw;
        overflow: hidden;
        position: relative;
        padding: 1rem 0 2rem;
        -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
    }

    .carousel-title {
        color: hsl(var(--muted-foreground));
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        margin: 0 0 1.5rem;
        font-weight: 600;
    }

    .apps-carousel-track {
        display: flex;
        gap: 1.25rem;
        width: max-content;
        animation: scroll 40s linear infinite;
        padding: 0.5rem 2rem;
    }

    .apps-carousel-track:hover,
    .apps-carousel-track:focus-within {
        animation-play-state: paused;
    }

    @media (prefers-reduced-motion: reduce) {
        .apps-carousel-track {
            animation: none;
        }
        .apps-carousel-container {
            overflow-x: auto;
        }
    }

    .app-card {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 14px;
        padding: 1.25rem;
        display: flex;
        align-items: center;
        gap: 1.25rem;
        width: 380px;
        transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        text-decoration: none;
        cursor: pointer;
    }

    .app-card:hover,
    .app-card:focus-visible {
        transform: translateY(-3px);
        border-color: var(--app-color);
        box-shadow: 0 10px 24px -12px var(--app-color);
        outline: none;
    }

    .app-icon {
        width: 56px;
        height: 56px;
        background: var(--app-color);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        color: white;
        flex-shrink: 0;
        overflow: hidden;
    }

    .app-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .app-info {
        text-align: left;
        min-width: 0;
    }

    .app-info h3 {
        margin: 0 0 0.3rem;
        font-size: 1.05rem;
        color: hsl(var(--foreground));
    }

    .app-info p {
        margin: 0;
        font-size: 0.85rem;
        color: hsl(var(--muted-foreground));
        line-height: 1.45;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    @keyframes scroll {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(calc(-50% - 0.625rem));
        }
    }

    @media (max-width: 768px) {
        .app-card {
            width: 290px;
            padding: 1rem;
            gap: 1rem;
        }
        .app-icon {
            width: 44px;
            height: 44px;
            font-size: 1.3rem;
        }
    }
</style>
