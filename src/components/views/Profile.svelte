<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { generate_reputation_proof } from "$lib/generate_reputation_proof";
    import { PROFILE_TYPE_NFT_ID } from "$lib/envs";
    import type { ReputationProof, RPBox } from "$lib/ReputationProof";

    export let reputationProof: ReputationProof | null;
    export let connected: boolean;

    const dispatch = createEventDispatcher();

    let isLoading = false;
    let errorMessage = "";
    let successMessage = "";

    // Form states
    let showAddBox = false;
    let showUpdateBox: RPBox | null = null;

    let newBoxAmount = 1;
    let newBoxPointer = "";
    let newBoxContent = "";
    let newBoxPolarization = true;

    function refreshProfile() {
        dispatch("refresh");
    }

    // --- Derived State ---
    $: mainBox = reputationProof?.current_boxes.find(
        (b) => b.object_pointer === reputationProof?.token_id,
    );

    // --- Sacrificed Assets Logic ---
    let burnedERG = "0";
    let burnedTokens: { tokenId: string; amount: number; name?: string }[] = [];

    $: if (reputationProof) {
        // Calculate total burned ERG (sum of all box values)
        const totalNanoErg = reputationProof.current_boxes.reduce(
            (acc, b) => acc + BigInt(b.box.value),
            BigInt(0),
        );
        burnedERG = (Number(totalNanoErg) / 1000000000).toFixed(4);

        // Aggregate burned tokens (excluding the reputation token itself)
        const tokenMap = new Map<string, number>();
        reputationProof.current_boxes.forEach((box) => {
            box.box.assets.forEach((asset) => {
                if (asset.tokenId !== reputationProof?.token_id) {
                    const current = tokenMap.get(asset.tokenId) || 0;
                    tokenMap.set(asset.tokenId, current + Number(asset.amount));
                }
            });
        });

        burnedTokens = Array.from(tokenMap.entries()).map(
            ([tokenId, amount]) => ({
                tokenId,
                amount,
                name: tokenId.substring(0, 8) + "...", // Placeholder for name
            }),
        );
    }

    // --- Filtering Logic ---
    const ALL_TYPES = "All";
    let selectedType: string = ALL_TYPES;
    let uniqueTypes: string[] = [];

    $: if (reputationProof) {
        const types = new Set<string>();
        reputationProof.current_boxes.forEach((box) => {
            if (box.type && box.type.typeName) {
                types.add(box.type.typeName);
            } else {
                types.add("Unknown");
            }
        });
        uniqueTypes = Array.from(types).sort();
    }

    $: filteredBoxes =
        reputationProof?.current_boxes.filter((box) => {
            if (selectedType === ALL_TYPES) return true;
            const typeName = box.type?.typeName || "Unknown";
            return typeName === selectedType;
        }) ?? [];

    // --- Actions ---
    async function handleCreateProfile() {
        isLoading = true;
        errorMessage = "";
        try {
            const txId = await generate_reputation_proof(
                1,
                1,
                PROFILE_TYPE_NFT_ID,
                undefined, // Will point to self
                true,
                "My Profile",
                false,
            );
            if (txId) {
                successMessage = `Profile creation transaction submitted: ${txId}`;
            }
        } catch (e: any) {
            errorMessage = `Error creating profile: ${e.message}`;
        } finally {
            isLoading = false;
        }
    }

    async function handleUpdateBox(box: RPBox) {
        if (!reputationProof) return;
        isLoading = true;
        errorMessage = "";
        try {
            const txId = await generate_reputation_proof(
                box.token_amount,
                reputationProof.total_amount,
                PROFILE_TYPE_NFT_ID,
                box.object_pointer,
                box.polarization,
                box.content,
                false,
                box,
            );
            if (txId) {
                successMessage = `Update box transaction submitted: ${txId}`;
                showUpdateBox = null;
            }
        } catch (e: any) {
            errorMessage = `Error updating box: ${e.message}`;
        } finally {
            isLoading = false;
        }
    }

    async function handleDeleteBox(box: RPBox) {
        if (!reputationProof || !mainBox) return;

        isLoading = true;
        errorMessage = "";
        try {
            const txId = await generate_reputation_proof(
                mainBox.token_amount + box.token_amount,
                reputationProof.total_amount,
                PROFILE_TYPE_NFT_ID,
                mainBox.object_pointer,
                mainBox.polarization,
                mainBox.content,
                false,
                mainBox,
                [box],
            );
            if (txId) {
                successMessage = `Delete box transaction submitted: ${txId}`;
            }
        } catch (e: any) {
            errorMessage = `Error deleting box: ${e.message}`;
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="profile-container">
    <div class="hero-section">
        <h2 class="project-title">Reputation Profile</h2>
        {#if reputationProof}
            <p class="subtitle">
                Manage your reputation and view your sacrifices.
            </p>
        {:else}
            <p class="subtitle">
                Connect and create your profile to start building reputation.
            </p>
        {/if}
    </div>

    {#if !connected}
        <div class="info-card center-text">
            <p>Please connect your wallet to view or create your profile.</p>
        </div>
    {:else if isLoading && !reputationProof}
        <div class="loading-spinner">Loading profile...</div>
    {:else if !reputationProof}
        <div class="no-profile">
            <div class="info-card center-text">
                <h3>No Profile Found</h3>
                <p>You don't have a reputation profile yet.</p>
                <button
                    class="primary-button"
                    on:click={handleCreateProfile}
                    disabled={isLoading}
                >
                    Create Profile
                </button>
            </div>
        </div>
    {:else}
        <!-- Sacrificed Assets Section -->
        <section class="sacrificed-assets">
            <div class="section-title-row">
                <div class="icon-circle orange">
                    <i class="fas fa-fire"></i>
                </div>
                <h3>Sacrificed Assets</h3>
            </div>

            <div class="assets-grid">
                <!-- ERG Card -->
                <div class="asset-card orange-gradient">
                    <div class="liquid-fire-container">
                        <div class="wave-box"></div>
                        <div class="wave-box"></div>
                        <div class="wave-box"></div>
                    </div>
                    <div class="card-content">
                        <div class="badge-row">
                            <span class="badge orange">Burned</span>
                        </div>
                        <div class="asset-info">
                            <p class="asset-label">Native Currency</p>
                            <p class="asset-amount">
                                {burnedERG} <span class="unit">ERG</span>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Token Cards -->
                {#each burnedTokens as token}
                    <div class="asset-card dark-card">
                        <div class="liquid-fire-container">
                            <div class="wave-box"></div>
                            <div class="wave-box"></div>
                            <div class="wave-box"></div>
                        </div>
                        <div class="card-content">
                            <div class="badge-row">
                                <span class="badge orange">Burned</span>
                            </div>
                            <div class="asset-info">
                                <p class="asset-label" title={token.tokenId}>
                                    {token.name}
                                </p>
                                <p class="asset-amount">{token.amount}</p>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </section>

        <div class="divider"></div>

        <!-- Technical Details -->
        <div class="technical-details">
            <div class="token-id-display">
                <span class="label">Profile Token ID</span>
                <div class="value mono">{reputationProof.token_id}</div>
            </div>
            <button
                class="secondary-button refresh-btn"
                on:click={refreshProfile}
                disabled={isLoading}
            >
                <i class="fas fa-sync"></i> Refresh
            </button>
        </div>

        {#if successMessage}
            <div class="feedback success">{successMessage}</div>
        {/if}
        {#if errorMessage}
            <div class="feedback error">{errorMessage}</div>
        {/if}

        <!-- Boxes Section -->
        <section class="boxes-section">
            <div class="section-title-row">
                <h3>Reputation Boxes</h3>
            </div>

            <!-- Filter Menu -->
            <div class="filter-menu">
                <button
                    class="filter-badge"
                    class:active={selectedType === ALL_TYPES}
                    on:click={() => (selectedType = ALL_TYPES)}
                >
                    All
                </button>
                {#each uniqueTypes as type}
                    <button
                        class="filter-badge"
                        class:active={selectedType === type}
                        on:click={() => (selectedType = type)}
                    >
                        {type}
                    </button>
                {/each}
            </div>

            <div class="boxes-grid">
                {#each filteredBoxes as box (box.box_id)}
                    <div
                        class="box-card"
                        class:positive={box.polarization}
                        class:negative={!box.polarization}
                    >
                        <div class="box-header">
                            <span class="box-type"
                                >{box.type?.typeName || "Unknown"}</span
                            >
                            <span class="polarization-icon">
                                {#if box.polarization}
                                    <i class="fas fa-check-circle"></i>
                                {:else}
                                    <i class="fas fa-times-circle"></i>
                                {/if}
                            </span>
                        </div>

                        <div class="box-body">
                            <div class="info-row">
                                <span class="label">Pointer:</span>
                                <span class="value mono small">
                                    {box.object_pointer ===
                                    reputationProof.token_id
                                        ? "SELF"
                                        : box.object_pointer.substring(0, 12) +
                                          "..."}
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="label">Content:</span>
                                <span class="value content-text">
                                    {typeof box.content === "object"
                                        ? JSON.stringify(box.content)
                                        : box.content || "No content"}
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="label">Amount:</span>
                                <span class="value">{box.token_amount}</span>
                            </div>
                        </div>

                        <div class="box-actions">
                            <button
                                class="icon-button"
                                title="Update"
                                on:click={() => (showUpdateBox = box)}
                            >
                                <i class="fas fa-edit"></i>
                            </button>
                            {#if box.object_pointer !== reputationProof.token_id}
                                <button
                                    class="icon-button delete"
                                    title="Delete"
                                    on:click={() => handleDeleteBox(box)}
                                >
                                    <i class="fas fa-trash"></i>
                                </button>
                            {/if}
                        </div>
                    </div>
                    {#if showUpdateBox === box}
                        <div class="form-card edit-overlay">
                            <h3>Update Box</h3>
                            <div class="form-group">
                                <label>Content</label>
                                <textarea bind:value={box.content}></textarea>
                            </div>
                            <div class="form-actions">
                                <button
                                    class="cancel-button"
                                    on:click={() => (showUpdateBox = null)}
                                    >Cancel</button
                                >
                                <button
                                    class="primary-button"
                                    on:click={() => handleUpdateBox(box)}
                                    disabled={isLoading}>Update</button
                                >
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
            {#if filteredBoxes.length === 0}
                <p class="no-results">No boxes found for this type.</p>
            {/if}
        </section>
    {/if}
</div>

<style>
    /* --- Base Layout --- */
    .profile-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1rem 4rem;
        color: #f0f0f0;
        font-family: "Inter", sans-serif;
    }

    /* --- Hero Section --- */
    .hero-section {
        text-align: center;
        margin-bottom: 3rem;
    }

    .project-title {
        font-size: 2.5rem;
        font-weight: 800;
        margin-bottom: 1rem;
        background: linear-gradient(to right, #f97316, #dc2626);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        display: inline-block;
    }

    .subtitle {
        font-size: 1.125rem;
        color: #a1a1aa;
        max-width: 42rem;
        margin: 0 auto;
    }

    /* --- Sacrificed Assets --- */
    .section-title-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .icon-circle {
        padding: 0.5rem;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon-circle.orange {
        background-color: rgba(
            255,
            237,
            213,
            0.1
        ); /* orange-100 equivalent with opacity */
        color: #ea580c; /* orange-600 */
    }

    .sacrificed-assets h3,
    .boxes-section h3 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #e2e8f0;
        margin: 0;
    }

    .assets-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }

    @media (min-width: 640px) {
        .assets-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    @media (min-width: 1024px) {
        .assets-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    .asset-card {
        border-radius: 0.75rem;
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
        min-height: 160px;
        display: flex;
        flex-direction: column;
    }

    .asset-card.orange-gradient {
        background: linear-gradient(
            to bottom right,
            rgba(255, 247, 237, 0.05),
            rgba(254, 242, 242, 0.05)
        );
        border: 1px solid rgba(253, 186, 116, 0.2);
    }

    .asset-card.dark-card {
        background-color: #1e1e1e; /* bg-card */
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: border-color 0.2s;
    }
    .asset-card.dark-card:hover {
        border-color: rgba(253, 186, 116, 0.5);
    }

    .card-content {
        position: relative;
        z-index: 10;
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .badge-row {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1.5rem;
    }

    .badge {
        font-size: 0.625rem;
        font-weight: 700;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .badge.orange {
        background-color: rgba(255, 237, 213, 0.1);
        color: #fdba74;
        border: 1px solid rgba(154, 52, 18, 0.3);
    }

    .asset-info {
        margin-top: auto;
    }

    .asset-label {
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin-bottom: 0.25rem;
    }

    .asset-amount {
        font-size: 1.875rem;
        font-weight: 700;
        color: #f1f5f9;
        line-height: 1;
    }

    .unit {
        font-size: 1.125rem;
        font-weight: 400;
        color: #64748b;
    }

    /* --- Liquid Fire Animation --- */
    .liquid-fire-container {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 6rem;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
    }

    .wave-box {
        position: absolute;
        width: 300%;
        height: 300%;
        left: -100%;
        bottom: -285%;
        background-color: rgba(239, 68, 68, 0.05);
        border-radius: 45%;
        animation: rotate 12s linear infinite;
    }

    .wave-box:nth-child(2) {
        bottom: -290%;
        background-color: rgba(239, 68, 68, 0.08);
        border-radius: 40% 45% 40% 45% / 40% 40% 45% 45%;
        animation: rotate 18s linear infinite reverse;
    }

    .wave-box:nth-child(3) {
        bottom: -295%;
        background-color: rgba(239, 68, 68, 0.05);
        border-radius: 42% 38% 45% 40% / 40% 45% 40% 38%;
        animation: rotate 25s linear infinite;
    }

    @keyframes rotate {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    /* --- Divider --- */
    .divider {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin: 2rem 0;
    }

    /* --- Technical Details --- */
    .technical-details {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 2rem;
        gap: 1rem;
    }

    .token-id-display {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .token-id-display .label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #a1a1aa;
        margin-bottom: 0.25rem;
    }

    .token-id-display .value {
        font-size: 1.25rem;
        font-weight: 500;
        color: #e2e8f0;
    }

    .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            monospace;
        word-break: break-all;
    }

    /* --- Filter Menu --- */
    .filter-menu {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .filter-badge {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #a1a1aa;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .filter-badge:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
    }

    .filter-badge.active {
        background: #fbbf24;
        color: #1a1a1a;
        border-color: #fbbf24;
        font-weight: 600;
    }

    /* --- Boxes Grid --- */
    .boxes-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .box-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-left-width: 4px;
        border-radius: 0.5rem;
        padding: 1rem;
        transition: all 0.2s;
    }

    .box-card:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .box-card.positive {
        border-left-color: #22c55e; /* green-500 */
    }

    .box-card.negative {
        border-left-color: #ef4444; /* red-500 */
    }

    .box-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
    }

    .box-type {
        font-size: 0.875rem;
        font-weight: 600;
        color: #e2e8f0;
        background: rgba(255, 255, 255, 0.1);
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
    }

    .polarization-icon {
        font-size: 1.25rem;
    }

    .positive .polarization-icon {
        color: #22c55e;
    }
    .negative .polarization-icon {
        color: #ef4444;
    }

    .box-body {
        font-size: 0.875rem;
        color: #cbd5e1;
    }

    .info-row {
        margin-bottom: 0.5rem;
        display: flex;
        gap: 0.5rem;
    }

    .info-row .label {
        color: #94a3b8;
        min-width: 60px;
    }

    .info-row .value {
        color: #f1f5f9;
        word-break: break-all;
    }

    .small {
        font-size: 0.75rem;
    }

    .content-text {
        font-style: italic;
        color: #a1a1aa;
    }

    .box-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 0.75rem;
    }

    .icon-button {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 0.25rem;
        transition: color 0.2s;
    }

    .icon-button:hover {
        color: #fff;
    }
    .icon-button.delete:hover {
        color: #ef4444;
    }

    /* --- Forms & Buttons --- */
    .primary-button {
        background: #fbbf24;
        color: #1a1a1a;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.375rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }
    .primary-button:hover {
        background: #f59e0b;
    }
    .primary-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .secondary-button {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: background 0.2s;
    }
    .secondary-button:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .cancel-button {
        background: transparent;
        border: 1px solid #4b5563;
        color: #9ca3af;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        cursor: pointer;
    }
    .cancel-button:hover {
        border-color: #d1d5db;
        color: #d1d5db;
    }

    .form-card {
        background: #262626;
        border: 1px solid #404040;
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin-top: 1rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        color: #d4d4d8;
        font-size: 0.875rem;
    }
    .form-group textarea {
        width: 100%;
        background: #171717;
        border: 1px solid #404040;
        color: #fff;
        padding: 0.5rem;
        border-radius: 0.25rem;
        min-height: 100px;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .feedback {
        padding: 1rem;
        border-radius: 0.375rem;
        margin-bottom: 1.5rem;
        text-align: center;
    }
    .feedback.success {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .feedback.error {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .center-text {
        text-align: center;
    }
    .info-card {
        background: #262626;
        padding: 2rem;
        border-radius: 0.5rem;
        border: 1px solid #404040;
    }
    .no-results {
        text-align: center;
        color: #71717a;
        margin-top: 2rem;
        font-style: italic;
    }
</style>
