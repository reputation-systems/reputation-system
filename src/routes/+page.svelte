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
    } from "$lib/unspent_proofs";

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

    onMount(async () => {
        await loadTypes();
    });

    $: if ($connected) {
        loadProfile();
        loadProofs();
    }

    async function loadTypes() {
        const typesMap = await fetchTypeNfts();
        types.set(typesMap);
    }

    async function loadProfile() {
        const allProfiles = await fetchAllProfiles(true, [], $types);
        user_profiles.set(allProfiles);
        if (allProfiles.length > 0) {
            reputation_proof.set(allProfiles[0]);
        } else {
            reputation_proof.set(null);
        }
    }

    async function loadProofs() {
        // updateReputationProofList returns Map<string, ReputationProof>
        // We pass $connected and $types (value of store)
        const proofsMap = await updateReputationProofList(
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
                <button
                    on:click={() => (currentPage = "types")}
                    class:active={currentPage === "types"}
                >
                    <i class="fas fa-tags"></i> Types
                </button>
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
                <p>You are connected.</p>
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
</style>
