<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";
    import { fetchAllProfiles } from "$lib/profileFetch";
    import { connectNautilus } from "$lib/connect";
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
    } from "$lib/store";
    import {
        updateReputationProofList,
        fetchTypeNfts,
    } from "$lib/fetch";
    import { explorer_uri } from "$lib/envs";

    import MasterGraphView from "$components/graph/MasterGraphView.svelte";
    import Submit from "$components/views/Submit.svelte";
    import Search from "$components/views/Search.svelte";
    import Settings from "$components/views/Settings.svelte";
    import ManageTypes from "$components/views/ManageTypes.svelte";
    import Profile from "$components/views/Profile.svelte";

    let currentPage:
        | "intro"
        | "graph"
        | "create"
        | "search"
        | "types"
        | "settings"
        | "profile" = "intro";

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
    let loadingProfiles = false;

    onMount(async () => {
        await loadTypes();
        randomPhrase =
            educationalPhrases[
                Math.floor(Math.random() * educationalPhrases.length)
            ];
    });

    $: if ($connected) {
        loadProfile();
        loadProofs();
    }

    async function loadTypes() {
        const typesMap = await fetchTypeNfts(explorer_uri);
        types.set(typesMap);
    }

    async function loadProfile() {
        loadingProfiles = true;
        try {
            const allProfiles = await fetchAllProfiles(
                explorer_uri,
                true,
                [],
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
            explorer_uri,
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
    <link rel="preload" href="/frame_52.svg" as="image" />
</svelte:head>

<main>
    {#if $connected && currentPage !== "intro"}
        <div class="view-switcher">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="app-title" on:click={() => (currentPage = "intro")}
                >Sigma Reputation</span
            >
            <div class="nav-buttons">
                <button
                    on:click={() => (currentPage = "profile")}
                    class:active={currentPage === "profile"}
                >
                    <i class="fas fa-user-circle"></i> Profile
                </button>

                <button
                    on:click={() => (currentPage = "types")}
                    class:active={currentPage === "types"}
                >
                    <i class="fas fa-tags"></i> Types
                </button>

                <div class="dropdown">
                    <button
                        class="dropdown-trigger"
                        class:active={["graph", "search", "create"].includes(
                            currentPage,
                        )}
                    >
                        <i class="fas fa-flask"></i> In Development
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="dropdown-content">
                        <button
                            on:click={() => (currentPage = "graph")}
                            class:active={currentPage === "graph"}
                        >
                            <i class="fas fa-project-diagram"></i> Graph
                        </button>
                        <button
                            on:click={() => (currentPage = "search")}
                            class:active={currentPage === "search"}
                        >
                            <i class="fas fa-search"></i> Search
                        </button>
                        <button
                            on:click={() => (currentPage = "create")}
                            class:active={currentPage === "create"}
                        >
                            <i class="fas fa-plus-circle"></i> Submit
                        </button>
                    </div>
                </div>

                <button
                    on:click={() => (currentPage = "settings")}
                    class:active={currentPage === "settings"}
                >
                    <i class="fas fa-cog"></i> Settings
                </button>
            </div>
        </div>
    {/if}

    {#if currentPage === "intro"}
        <div class="welcome-container">
            <a
                class="github-button"
                href="https://github.com/reputation-systems/sigma-reputation-panel"
                target="_blank"
                title="View on GitHub"
            >
                <i class="fab fa-github"></i>
            </a>
            <h1>Welcome to Sigma Reputation</h1>

            {#if $connected}
                <div class="educational-phrase">
                    <p class="phrase-label">Did you know?</p>
                    <p class="phrase-text">{randomPhrase}</p>
                </div>
                {#if loadingProfiles}
                    <div class="loading-status">
                        <i class="fas fa-spinner fa-spin"></i> Preloading your reputation...
                    </div>
                {/if}
                <button on:click={() => (currentPage = "profile")}
                    >Explore</button
                >
            {:else}
                <p>
                    Connect your Nautilus wallet to explore and build the web of
                    trust on Ergo.
                </p>
                <button on:click={connectNautilus}>Connect Wallet</button>
            {/if}

            <div class="apps-carousel-container">
                <p class="carousel-title">Powered by Sigma Reputation</p>
                <div class="apps-carousel-track">
                    {#each [...implementingApps, ...implementingApps] as app}
                        <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="app-card"
                            style="--app-color: {app.color}"
                        >
                            <div class="app-icon">
                                {#if app.image}
                                    <img src={app.image} alt={app.name} />
                                {:else}
                                    <i class="fas {app.icon}"></i>
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
            {#if currentPage === "graph"}
                <MasterGraphView />
            {:else if currentPage === "search"}
                <Search
                    types={$types}
                    connected={$connected}
                    on:searchGraph={() => (currentPage = "graph")}
                />
            {:else if currentPage === "create"}
                <div class="wizard-wrapper">
                    <Submit
                        proofs={$proofs}
                        connected={$connected}
                        types={$types}
                    />
                </div>
            {:else if currentPage === "types"}
                <div class="wizard-wrapper">
                    <ManageTypes types={$types} on:refresh={loadTypes} />
                </div>
            {:else if currentPage === "settings"}
                <Settings
                    address={$address}
                    network={$network}
                    bind:fetchAll={$fetch_all}
                    bind:computeDeepLevel={$compute_deep_level}
                />
            {:else if currentPage === "profile"}
                <Profile
                    reputationProof={$reputation_proof}
                    userProfiles={$user_profiles}
                    connected={$connected}
                    on:refresh={handleProfileRefresh}
                    on:switchProfile={(e) => reputation_proof.set(e.detail)}
                />
            {/if}
        </div>
    {/if}
</main>

<style>
    :global(html, body) {
        height: auto;
        overflow-x: hidden;
        overflow-y: auto;
    }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, sans-serif;
    }

    main {
        background-color: #1a1a1a;
        color: #f0f0f0;
        min-height: 100vh;
        overflow: visible;
    }

    .welcome-container {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        text-align: center;
        padding: 2rem;
        box-sizing: border-box;
        overflow: hidden;
    }

    .welcome-container::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url("/frame_52.svg");
        background-repeat: no-repeat;
        background-position: right center;
        background-size: contain;
        z-index: 0;
        filter: saturate(200%) brightness(1.25);
        opacity: 0.8;
    }

    .welcome-container > * {
        position: relative;
        z-index: 1;
    }

    .welcome-container h1 {
        font-size: 3rem;
        color: #fbbf24;
    }
    .welcome-container button {
        padding: 1rem 2rem;
        font-size: 1.2rem;
        margin-top: 2rem;
    }

    .educational-phrase {
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.3);
        padding: 1.5rem;
        border-radius: 12px;
        margin: 2rem 0;
        max-width: 500px;
        backdrop-filter: blur(5px);
    }

    .phrase-label {
        color: #fbbf24;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
        letter-spacing: 0.05em;
    }

    .phrase-text {
        font-size: 1.1rem;
        line-height: 1.4;
        color: #f0f0f0;
        margin: 0;
    }

    .loading-status {
        font-size: 0.9rem;
        color: #94a3b8;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .view-switcher {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(26, 25, 35, 0.7);
        backdrop-filter: blur(10px);
        padding: 0.5rem 1.5rem;
        z-index: 1000;
        border-bottom: 1px solid #333;
        box-sizing: border-box;
    }

    .app-title {
        font-size: 1.1rem;
        font-weight: bold;
        color: #fbbf24;
        cursor: pointer;
    }

    .nav-buttons button {
        padding: 0.5rem 1rem;
        background: transparent;
        color: #ccc;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.9rem;
        cursor: pointer;
        margin-left: 0.5rem;
        transition:
            background-color 0.2s,
            color 0.2s;
    }

    .nav-buttons button i {
        margin-right: 0.5rem;
    }

    .nav-buttons button:hover {
        background-color: #3a3a3a;
        color: white;
    }

    .nav-buttons button.active {
        background-color: #fbbf24;
        color: #000;
    }

    /* Dropdown Styles */
    .dropdown {
        position: relative;
        display: inline-block;
        margin-left: 0.5rem;
    }

    .dropdown-trigger {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .dropdown-trigger i.fa-chevron-down {
        font-size: 0.7rem;
        transition: transform 0.2s;
    }

    .dropdown:hover .dropdown-trigger i.fa-chevron-down {
        transform: rotate(180deg);
    }

    .dropdown-content {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        background-color: #2a2a2a;
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.5);
        z-index: 1001;
        border-radius: 6px;
        border: 1px solid #444;
        padding: 0.5rem 0;
    }

    .dropdown:hover .dropdown-content {
        display: block;
    }

    .dropdown-content button {
        display: flex;
        align-items: center;
        width: calc(100% - 1rem);
        margin: 0.25rem 0.5rem;
        text-align: left;
        padding: 0.6rem 0.8rem;
        background: transparent;
        color: #ccc;
        border: none;
        border-radius: 4px;
        font-size: 0.85rem;
        transition:
            background 0.2s,
            color 0.2s;
    }

    .dropdown-content button:hover {
        background-color: #3a3a3a;
        color: white;
    }

    .dropdown-content button.active {
        background-color: #fbbf24;
        color: #000;
    }

    .github-button {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1001;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(51, 51, 51, 0.5);
        color: #ccc;
        border-radius: 50%;
        font-size: 1.5rem;
        text-decoration: none;
        transition: all 0.2s ease-in-out;
    }
    .github-button:hover {
        background-color: #333;
        color: white;
        transform: scale(1.1);
    }

    .view-content {
        padding-top: 53px;
    }

    .wizard-wrapper {
        display: flex;
        justify-content: center;
        padding: 2rem;
        width: 100%;
        box-sizing: border-box;
        padding: 2rem;
    }

    /* Carousel Styles */
    .apps-carousel-container {
        margin-top: 4rem;
        width: 100%;
        max-width: 100vw;
        overflow: hidden;
        position: relative;
        padding: 2rem 0;
    }

    .carousel-title {
        color: #94a3b8;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 2rem;
        font-weight: 600;
    }

    .apps-carousel-track {
        display: flex;
        gap: 2rem;
        width: max-content;
        animation: scroll 30s linear infinite;
        padding: 0 2rem;
    }

    .apps-carousel-track:hover {
        animation-play-state: paused;
    }

    .app-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        min-width: 380px;
        max-width: 450px;
        backdrop-filter: blur(10px);
        transition:
            transform 0.3s ease,
            border-color 0.3s ease,
            background-color 0.3s ease;
        text-decoration: none;
        cursor: pointer;
    }

    .app-card:hover {
        transform: translateY(-5px);
        border-color: var(--app-color);
        background: rgba(255, 255, 255, 0.05);
    }

    .app-icon {
        width: 60px;
        height: 60px;
        background: var(--app-color);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        color: white;
        box-shadow: 0 8px 16px -4px var(--app-color);
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
    }

    .app-info h3 {
        margin: 0;
        font-size: 1.2rem;
        color: #f0f0f0;
        margin-bottom: 0.4rem;
    }

    .app-info p {
        margin: 0;
        font-size: 0.9rem;
        color: #94a3b8;
        line-height: 1.4;
    }

    @keyframes scroll {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(calc(-50% - 1rem));
        }
    }

    @media (max-width: 768px) {
        .app-card {
            min-width: 280px;
            padding: 1rem;
            gap: 1rem;
        }
        .app-icon {
            width: 48px;
            height: 48px;
            font-size: 1.4rem;
        }
        .app-info h3 {
            font-size: 1.1rem;
        }
    }
</style>
