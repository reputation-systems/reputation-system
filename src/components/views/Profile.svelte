<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import { create_profile } from "$lib/create_profile";
    import { update_opinion } from "$lib/update_opinion";
    import { remove_opinion } from "$lib/remove_opinion";
    import { sacrifice_assets } from "$lib/sacrifice_assets";
    import {
        PROFILE_TOTAL_SUPPLY,
        PROFILE_TYPE_NFT_ID,
        explorer_uri,
    } from "$lib/envs";
    import type { ReputationProof, RPBox } from "$lib/ReputationProof";

    // --- Core Props ---
    export let reputationProof: ReputationProof | null;
    export let userProfiles: ReputationProof[] = [];
    export let connected: boolean;

    // --- Existing Customization Props ---
    export let title = "Reputation Profile";
    export let showDidacticInfo = true;
    export let visibleTokenTypes: string[] | null = null;

    // --- Section Visibility Props ---
    export let showProfileSwitcher = true;
    export let showSacrificedAssets = true;
    export let showTechnicalDetails = true;
    export let showBoxesSection = true;
    export let showFilters = true;

    // --- Action Control Props ---
    export let allowCreateProfile = true;
    export let allowSacrifice = true;
    export let allowEditBox = true;
    export let allowDeleteBox = true;
    export let allowSetMainBox = true;

    // --- Visual Customization Props ---
    export let subtitle: string | null = null;
    export let compact = false;
    export let maxBoxesVisible: number | null = null;

    // --- Behavior Props ---
    export let readOnly = false;
    export let autoRefresh = false;
    export let refreshInterval = 30000;

    // --- Computed Effective Permissions ---
    $: effectiveAllowCreate = !readOnly && allowCreateProfile;
    $: effectiveAllowSacrifice = !readOnly && allowSacrifice;
    $: effectiveAllowEdit = !readOnly && allowEditBox;
    $: effectiveAllowDelete = !readOnly && allowDeleteBox;
    $: effectiveAllowSetMain = !readOnly && allowSetMainBox;

    const dispatch = createEventDispatcher();

    let isLoading = false;
    let errorMessage = "";
    let successMessage = "";

    let showUpdateBox: RPBox | null = null;
    let newBoxPolarization = true;

    let editingContent = "";
    let editingAmount = 0;
    let editingMaxAmount = 0;

    type EditorMode = "text" | "kv" | "json";
    let editorMode: EditorMode = "text";
    let kvPairs: { key: string; value: string }[] = [];

    function openUpdateBox(box: RPBox) {
        showUpdateBox = box;
        editingAmount = box.token_amount;
        editingMaxAmount = box.token_amount + (mainBox?.token_amount || 0);
        editingContent =
            typeof box.content === "object"
                ? JSON.stringify(box.content, null, 2)
                : box.content || "";

        // Initialize KV pairs if it's an object
        if (typeof box.content === "object" && box.content !== null) {
            kvPairs = Object.entries(box.content).map(([k, v]) => ({
                key: k,
                value: typeof v === "object" ? JSON.stringify(v) : String(v),
            }));
            editorMode = "kv";
        } else {
            kvPairs = [];
            editorMode = "text";
        }
    }

    function syncToKV() {
        try {
            const obj = JSON.parse(editingContent);
            if (typeof obj === "object" && obj !== null) {
                kvPairs = Object.entries(obj).map(([k, v]) => ({
                    key: k,
                    value:
                        typeof v === "object" ? JSON.stringify(v) : String(v),
                }));
            }
        } catch (e) {
            // If not valid JSON, we can't sync to KV easily, maybe just leave as is or clear
        }
    }

    function syncFromKV() {
        const obj: any = {};
        kvPairs.forEach((p) => {
            if (p.key) {
                try {
                    obj[p.key] = JSON.parse(p.value);
                } catch (e) {
                    obj[p.key] = p.value;
                }
            }
        });
        editingContent = JSON.stringify(obj, null, 2);
    }

    function setEditorMode(mode: EditorMode) {
        if (mode === "kv") {
            syncToKV();
        } else if (editorMode === "kv") {
            syncFromKV();
        }
        editorMode = mode;
    }

    function addKVPair() {
        kvPairs = [...kvPairs, { key: "", value: "" }];
    }

    function removeKVPair(index: number) {
        kvPairs = kvPairs.filter((_, i) => i !== index);
    }

    function refreshProfile() {
        dispatch("refresh");
    }

    let isSwitcherExpanded = false;

    function toggleSwitcher() {
        isSwitcherExpanded = !isSwitcherExpanded;
    }

    function switchProfile(profile: ReputationProof) {
        dispatch("switchProfile", profile);
        isSwitcherExpanded = false;
    }

    // --- Click Outside Action ---
    function clickOutside(node: HTMLElement, callback: () => void) {
        const handleClick = (event: MouseEvent) => {
            if (
                node &&
                !node.contains(event.target as Node) &&
                !event.defaultPrevented
            ) {
                callback();
            }
        };

        document.addEventListener("click", handleClick, true);

        return {
            destroy() {
                document.removeEventListener("click", handleClick, true);
            },
        };
    }

    // --- Derived State ---
    let selectedMainBoxId: string | null = null;

    $: if (reputationProof) {
        if (
            selectedMainBoxId &&
            !reputationProof.current_boxes.some(
                (b) => b.box_id === selectedMainBoxId,
            )
        ) {
            selectedMainBoxId = null;
        }
    }

    $: mainBox = (() => {
        const selfBoxes =
            reputationProof?.current_boxes.filter(
                (b) => b.object_pointer === reputationProof?.token_id,
            ) || [];

        if (selfBoxes.length === 0) return null;

        if (selectedMainBoxId) {
            const found = selfBoxes.find((b) => b.box_id === selectedMainBoxId);
            if (found) return found;
        }

        // Default: most tokens
        return [...selfBoxes].sort(
            (a, b) => b.token_amount - a.token_amount,
        )[0];
    })();

    // --- Sacrificed Assets Logic ---
    let burnedERG = "0";
    let burnedTokens: {
        tokenId: string;
        amount: number;
        name?: string;
        decimals?: number;
    }[] = [];
    let tokenMetadataCache = new Map<
        string,
        { name: string; decimals?: number }
    >();

    async function fetchTokenMetadata(tokenId: string) {
        if (tokenMetadataCache.has(tokenId)) return;
        try {
            const response = await fetch(
                `https://api.ergoplatform.com/api/v1/tokens/${tokenId}`,
            );
            if (response.ok) {
                const data = await response.json();
                if (data.name) {
                    tokenMetadataCache.set(tokenId, {
                        name: data.name,
                        decimals: data.decimals,
                    });
                    tokenMetadataCache = tokenMetadataCache; // Trigger reactivity
                }
            }
        } catch (e) {
            console.error(`Error fetching metadata for ${tokenId}:`, e);
        }
    }

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
            ([tokenId, amount]) => {
                const metadata = tokenMetadataCache.get(tokenId);
                if (!metadata) fetchTokenMetadata(tokenId);
                return {
                    tokenId,
                    amount,
                    name: metadata?.name || tokenId.substring(0, 8) + "...",
                    decimals: metadata?.decimals || 0,
                };
            },
        );
    }

    // --- Filtering Logic ---
    const ALL_TYPES = "All";
    let selectedType: string = ALL_TYPES;
    let showOnlySelf = false;
    let lockedFilter: "all" | "locked" | "unlocked" = "all";
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

    const OTHERS_TYPE = "Others";
    $: displayedTypes = visibleTokenTypes
        ? uniqueTypes.filter((t) => visibleTokenTypes.includes(t))
        : uniqueTypes;

    $: hasOthers = visibleTokenTypes
        ? uniqueTypes.some((t) => !visibleTokenTypes.includes(t))
        : false;

    $: filteredBoxes =
        reputationProof?.current_boxes.filter((box) => {
            const typeName = box.type?.typeName || "Unknown";
            const matchesType =
                selectedType === ALL_TYPES ||
                (selectedType === OTHERS_TYPE &&
                    visibleTokenTypes &&
                    !visibleTokenTypes.includes(typeName)) ||
                typeName === selectedType;
            const matchesSelf =
                !showOnlySelf ||
                box.object_pointer === reputationProof?.token_id;
            const matchesLocked =
                lockedFilter === "all" ||
                (lockedFilter === "locked" && box.is_locked) ||
                (lockedFilter === "unlocked" && !box.is_locked);
            return matchesType && matchesSelf && matchesLocked;
        }) ?? [];

    // --- MaxBoxesVisible Logic ---
    $: displayedBoxes = maxBoxesVisible
        ? filteredBoxes.slice(0, maxBoxesVisible)
        : filteredBoxes;

    $: hasMoreBoxes = maxBoxesVisible && filteredBoxes.length > maxBoxesVisible;

    // --- Actions ---
    async function handleCreateProfile() {
        isLoading = true;
        errorMessage = "";
        try {
            const txId = await create_profile(
                PROFILE_TOTAL_SUPPLY,
                PROFILE_TYPE_NFT_ID,
                explorer_uri,
                "Anonymous",
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

        let finalContent: any = editingContent;
        if (editorMode === "kv") {
            syncFromKV();
            finalContent = JSON.parse(editingContent);
        } else {
            try {
                finalContent = JSON.parse(editingContent);
            } catch (e) {
                // Not JSON, keep as string
            }
        }

        try {
            const txId = await update_opinion(
                box,
                explorer_uri,
                box.polarization,
                finalContent,
                editingAmount - box.token_amount,
                0n,
                false,
                mainBox!,
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
            const txId = await remove_opinion(box, mainBox, explorer_uri);
            if (txId) {
                successMessage = `Delete box transaction submitted: ${txId}`;
            }
        } catch (e: any) {
            errorMessage = `Error deleting box: ${e.message}`;
        } finally {
            isLoading = false;
        }
    }

    function toggleLockedFilter(value: "locked" | "unlocked") {
        if (lockedFilter === value) {
            lockedFilter = "all";
        } else {
            lockedFilter = value;
        }
    }

    // --- Sacrifice Assets ---
    let showSacrificeForm = false;
    let sacrificeERG = 0;
    let sacrificeTokens: {
        tokenId: string;
        amount: number;
        name?: string;
        maxAmount: number;
        decimals?: number;
    }[] = [];
    let walletTokens: { tokenId: string; amount: number; name?: string }[] = [];
    let showTokenSelector = false;

    async function fetchWalletTokens() {
        try {
            // @ts-ignore
            const utxos = await ergo.get_utxos();
            const tokenMap = new Map<
                string,
                { tokenId: string; amount: number }
            >();
            for (const utxo of utxos) {
                for (const asset of utxo.assets) {
                    const current = tokenMap.get(asset.tokenId) || {
                        tokenId: asset.tokenId,
                        amount: 0,
                    };
                    tokenMap.set(asset.tokenId, {
                        tokenId: asset.tokenId,
                        amount: current.amount + Number(asset.amount),
                    });
                }
            }
            walletTokens = Array.from(tokenMap.values()).map((t) => {
                const metadata = tokenMetadataCache.get(t.tokenId);
                if (!metadata) fetchTokenMetadata(t.tokenId);
                return {
                    ...t,
                    name: metadata?.name || t.tokenId.substring(0, 8) + "...",
                };
            });
        } catch (e) {
            console.error("Error fetching wallet tokens:", e);
        }
    }

    function addTokenToSacrifice(token: {
        tokenId: string;
        amount: number;
        name?: string;
        decimals?: number;
    }) {
        if (sacrificeTokens.some((t) => t.tokenId === token.tokenId)) return;
        sacrificeTokens = [
            ...sacrificeTokens,
            {
                tokenId: token.tokenId,
                amount: 0,
                name: token.name,
                maxAmount: token.amount,
                decimals: token.decimals || 0,
            },
        ];
        showTokenSelector = false;
    }

    function removeTokenFromSacrifice(tokenId: string) {
        sacrificeTokens = sacrificeTokens.filter((t) => t.tokenId !== tokenId);
    }

    async function handleSacrifice() {
        if (!reputationProof || !mainBox) return;
        isLoading = true;
        errorMessage = "";

        // ERG has 9 decimals
        const extra_erg = BigInt(Math.round(sacrificeERG * 1000000000));
        const extra_tokens = sacrificeTokens
            .filter((t) => t.amount > 0)
            .map((t) => ({
                tokenId: t.tokenId,
                // Tokens can have decimals too, but for now we use raw amount if not specified
                amount: BigInt(
                    Math.round(t.amount * Math.pow(10, t.decimals || 0)),
                ),
            }));

        try {
            const txId = await sacrifice_assets(
                mainBox,
                explorer_uri,
                extra_erg,
                extra_tokens,
            );
            if (txId) {
                successMessage = `Sacrifice transaction submitted: ${txId}`;
                showSacrificeForm = false;
                sacrificeERG = 0;
                sacrificeTokens = [];
            }
        } catch (e: any) {
            errorMessage = `Error sacrificing assets: ${e.message}`;
        } finally {
            isLoading = false;
        }
    }

    $: if (showSacrificeForm) {
        fetchWalletTokens();
    }

    // --- Auto-Refresh Logic ---
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    $: if (autoRefresh && refreshInterval > 0) {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(refreshProfile, refreshInterval);
    } else if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }

    onDestroy(() => {
        if (refreshTimer) clearInterval(refreshTimer);
    });
</script>

<div class="profile-container" class:compact>
    <div class="hero-section">
        <h2 class="project-title">{title}</h2>
        {#if reputationProof}
            <p class="subtitle">
                {subtitle || "Manage your reputation and view your sacrifices."}
                {#if showDidacticInfo}
                    <span
                        class="terminology-tip"
                        title="Every Reputation Profile is technically a Reputation Proof. A Profile is a Proof used for identity."
                    >
                        <i class="fas fa-info-circle"></i>
                    </span>
                {/if}
            </p>
        {:else}
            <p class="subtitle">
                {subtitle ||
                    "Connect and create your profile to start building reputation."}
            </p>
        {/if}
    </div>

    {#if !connected}
        <div class="info-card center-text">
            <p>Please connect your wallet to view or create your profile.</p>
        </div>
    {:else}
        {#if showProfileSwitcher}
            <!-- Compactable Profile Switcher -->
            <div
                class="profile-switcher-v2"
                class:expanded={isSwitcherExpanded}
            >
                <div class="switcher-main-row">
                    <button
                        class="current-profile-info"
                        on:click={toggleSwitcher}
                    >
                        <div class="profile-avatar">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div class="profile-meta">
                            <div class="profile-types-container">
                                {#if reputationProof?.types && reputationProof.types.length > 0}
                                    {#each reputationProof.types as type}
                                        <span class="profile-type-badge"
                                            >{type.typeName}</span
                                        >
                                    {/each}
                                {:else}
                                    <span class="profile-type-badge"
                                        >Reputation Proof</span
                                    >
                                {/if}
                            </div>
                            <span class="profile-id-main"
                                >{reputationProof?.token_id.substring(
                                    0,
                                    12,
                                )}...</span
                            >
                        </div>
                        <i class="fas fa-chevron-down chevron-icon"></i>
                    </button>

                    {#if effectiveAllowCreate}
                        <button
                            class="create-profile-btn-v2"
                            on:click={handleCreateProfile}
                            disabled={isLoading}
                            title="Create New Reputation Proof"
                        >
                            <i class="fas fa-plus"></i>
                        </button>
                    {/if}
                </div>

                {#if isSwitcherExpanded}
                    <div class="profiles-dropdown">
                        <div class="dropdown-header">
                            Select a Profile / Proof
                        </div>
                        <div class="dropdown-list">
                            {#each userProfiles as profile}
                                <button
                                    class="dropdown-item"
                                    class:active={reputationProof?.token_id ===
                                        profile.token_id}
                                    on:click={() => switchProfile(profile)}
                                >
                                    <div class="item-icon">
                                        <i class="fas fa-id-card"></i>
                                    </div>
                                    <div class="item-content">
                                        <div class="item-top">
                                            <div class="item-types">
                                                {#if profile.types && profile.types.length > 0}
                                                    {#each profile.types as type}
                                                        <span class="item-type"
                                                            >{type.typeName}</span
                                                        >
                                                    {/each}
                                                {:else}
                                                    <span class="item-type"
                                                        >Proof</span
                                                    >
                                                {/if}
                                            </div>
                                            <span class="item-id"
                                                >{profile.token_id.substring(
                                                    0,
                                                    8,
                                                )}...</span
                                            >
                                        </div>
                                        <div class="item-bottom">
                                            <span class="item-erg">
                                                {(
                                                    Number(
                                                        profile.current_boxes.reduce(
                                                            (acc, b) =>
                                                                acc +
                                                                BigInt(
                                                                    b.box.value,
                                                                ),
                                                            BigInt(0),
                                                        ),
                                                    ) / 1000000000
                                                ).toFixed(4)} ERG Burned
                                            </span>
                                        </div>
                                    </div>
                                    {#if reputationProof?.token_id === profile.token_id}
                                        <i class="fas fa-check check-icon"></i>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        {#if isLoading && !reputationProof}
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
            {#if showSacrificedAssets}
                <!-- Sacrificed Assets Section -->
                <section class="sacrificed-assets">
                    <div class="section-title-row">
                        <div class="icon-circle orange">
                            <i class="fas fa-fire"></i>
                        </div>
                        <h3>Sacrificed Assets</h3>
                        {#if showDidacticInfo}
                            <div
                                class="info-tooltip"
                                title="Sacrificed assets (burned ERG and tokens) demonstrate your commitment and responsibility. By locking value into your reputation boxes, you provide a tangible backing for your decentralized identity. These assets are permanent and can never be withdrawn (except for storage rent/demurrage)."
                            >
                                <i class="fas fa-question-circle"></i>
                            </div>
                        {/if}
                        {#if effectiveAllowSacrifice}
                            <button
                                class="sacrifice-toggle-btn"
                                on:click={() =>
                                    (showSacrificeForm = !showSacrificeForm)}
                            >
                                <i class="fas fa-plus"></i> Sacrifice More
                            </button>
                        {/if}
                    </div>

                    {#if showSacrificeForm}
                        <div class="sacrifice-form info-card">
                            <h4>Sacrifice Assets</h4>
                            <p class="small-text">
                                Add ERG or tokens to your main reputation box.
                                This action is irreversible and demonstrates
                                your commitment.
                            </p>

                            <div class="form-group">
                                <label for="sacrifice-erg">Extra ERG</label>
                                <input
                                    id="sacrifice-erg"
                                    type="number"
                                    step="0.000000001"
                                    bind:value={sacrificeERG}
                                    placeholder="0.000000000"
                                />
                            </div>

                            <div class="form-group">
                                <label>Tokens to Sacrifice</label>
                                <div class="selected-tokens-list">
                                    {#each sacrificeTokens as token}
                                        <div class="selected-token-item">
                                            <div class="token-info-mini">
                                                <span
                                                    class="token-name"
                                                    title={token.tokenId}
                                                    >{token.name}</span
                                                >
                                                <span class="token-max"
                                                    >(Max: {token.maxAmount})</span
                                                >
                                            </div>
                                            <input
                                                type="number"
                                                bind:value={token.amount}
                                                max={token.maxAmount}
                                                placeholder="Amount"
                                            />
                                            <button
                                                class="remove-token-btn"
                                                on:click={() =>
                                                    removeTokenFromSacrifice(
                                                        token.tokenId,
                                                    )}
                                            >
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    {/each}
                                </div>

                                <div
                                    class="token-selector-container"
                                    use:clickOutside={() =>
                                        (showTokenSelector = false)}
                                >
                                    <button
                                        class="add-token-trigger"
                                        on:click|stopPropagation={() =>
                                            (showTokenSelector =
                                                !showTokenSelector)}
                                    >
                                        <i class="fas fa-plus-circle"></i> Add Token
                                        from Wallet
                                    </button>

                                    {#if showTokenSelector}
                                        <div class="token-dropdown">
                                            {#if walletTokens.length === 0}
                                                <p class="dropdown-empty">
                                                    No tokens found in wallet.
                                                </p>
                                            {:else}
                                                {#each walletTokens as token}
                                                    <button
                                                        class="dropdown-option"
                                                        on:click={() =>
                                                            addTokenToSacrifice(
                                                                token,
                                                            )}
                                                        disabled={sacrificeTokens.some(
                                                            (t) =>
                                                                t.tokenId ===
                                                                token.tokenId,
                                                        )}
                                                    >
                                                        <span class="opt-name"
                                                            >{token.name}</span
                                                        >
                                                        <span class="opt-amount"
                                                            >{token.amount}</span
                                                        >
                                                    </button>
                                                {/each}
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <div class="form-actions">
                                <button
                                    class="primary-button"
                                    on:click={handleSacrifice}
                                    disabled={isLoading}
                                >
                                    Confirm Sacrifice
                                </button>
                                <button
                                    class="secondary-button"
                                    on:click={() => (showSacrificeForm = false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    {/if}

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
                                        {burnedERG}
                                        <span class="unit">ERG</span>
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
                                        <p
                                            class="asset-label"
                                            title={token.tokenId}
                                        >
                                            {token.name}
                                        </p>
                                        <p class="asset-amount">
                                            {token.amount}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            {#if showTechnicalDetails}
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
            {/if}

            {#if successMessage}
                <div class="feedback success">{successMessage}</div>
            {/if}
            {#if errorMessage}
                <div class="feedback error">{errorMessage}</div>
            {/if}

            {#if showBoxesSection}
                <!-- Boxes Section -->
                <section class="boxes-section">
                    <div class="section-title-row">
                        <h3>Reputation Boxes</h3>
                        {#if showDidacticInfo}
                            <div
                                class="info-tooltip"
                                title="Reputation is modular. Each box represents a specific piece of information, an opinion, or a claim, linked to a specific Type standard."
                            >
                                <i class="fas fa-question-circle"></i>
                            </div>
                        {/if}
                    </div>

                    {#if showFilters}
                        <!-- Filter Menu -->
                        <div class="filter-container">
                            <div class="filter-menu">
                                <button
                                    class="filter-badge"
                                    class:active={selectedType === ALL_TYPES}
                                    on:click={() => (selectedType = ALL_TYPES)}
                                >
                                    All
                                </button>
                                {#each displayedTypes as type}
                                    <button
                                        class="filter-badge"
                                        class:active={selectedType === type}
                                        on:click={() => (selectedType = type)}
                                    >
                                        {type}
                                    </button>
                                {/each}
                                {#if hasOthers}
                                    <button
                                        class="filter-badge"
                                        class:active={selectedType ===
                                            OTHERS_TYPE}
                                        on:click={() =>
                                            (selectedType = OTHERS_TYPE)}
                                    >
                                        {OTHERS_TYPE}
                                    </button>
                                {/if}
                            </div>

                            <div class="secondary-filters-column">
                                <div class="secondary-filters">
                                    <div class="filter-group-with-info">
                                        <button
                                            class="filter-badge self-filter"
                                            class:active={showOnlySelf}
                                            on:click={() =>
                                                (showOnlySelf = !showOnlySelf)}
                                        >
                                            <i class="fas fa-fingerprint"></i> SELF
                                            Only
                                        </button>
                                        {#if showDidacticInfo}
                                            <div
                                                class="info-tooltip"
                                                title="SELF boxes are reputation boxes that point back to your own profile. They represent your core reputation and serve as containers for your reputation tokens, allowing you to issue new reputation boxes by distributing tokens from them. When you delete other boxes, their tokens are merged into your selected Main SELF box."
                                            >
                                                <i
                                                    class="fas fa-question-circle"
                                                ></i>
                                            </div>
                                        {/if}
                                    </div>
                                </div>

                                <div class="secondary-filters">
                                    <div class="filter-group-with-info">
                                        <div class="locked-filter-group">
                                            <button
                                                class="filter-badge"
                                                class:active={lockedFilter ===
                                                    "locked"}
                                                on:click={() =>
                                                    toggleLockedFilter(
                                                        "locked",
                                                    )}
                                            >
                                                <i class="fas fa-lock"></i> Locked
                                            </button>
                                            <button
                                                class="filter-badge"
                                                class:active={lockedFilter ===
                                                    "unlocked"}
                                                on:click={() =>
                                                    toggleLockedFilter(
                                                        "unlocked",
                                                    )}
                                            >
                                                <i class="fas fa-lock-open"></i>
                                                Unlocked
                                            </button>
                                        </div>
                                        {#if showDidacticInfo}
                                            <div
                                                class="info-tooltip"
                                                title="Locked boxes are those that cannot be modified or deleted, often used as a guarantee. Unlocked boxes can be updated or deleted, but tokens (reputation and sacrificed assets) can only be moved to other boxes within the same profile. They can never leave the reputation proof system."
                                            >
                                                <i
                                                    class="fas fa-question-circle"
                                                ></i>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <div class="boxes-grid">
                        {#each displayedBoxes as box (box.box_id)}
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
                                                : box.object_pointer.substring(
                                                      0,
                                                      12,
                                                  ) + "..."}
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
                                        <span class="value"
                                            >{box.token_amount}</span
                                        >
                                    </div>
                                </div>

                                <div class="box-actions">
                                    {#if mainBox?.box_id === box.box_id}
                                        <span
                                            class="main-action-label"
                                            title={showDidacticInfo
                                                ? "The Main Box is your primary container for reputation tokens. When you delete other boxes, their tokens are merged here."
                                                : ""}
                                        >
                                            <i class="fas fa-star"></i> Main
                                        </span>
                                    {/if}
                                    {#if effectiveAllowSetMain && box.object_pointer === reputationProof?.token_id && mainBox?.box_id !== box.box_id}
                                        <button
                                            class="icon-button main-selector"
                                            title="Set as Main"
                                            on:click={() =>
                                                (selectedMainBoxId =
                                                    box.box_id)}
                                        >
                                            <i class="fas fa-star"></i>
                                        </button>
                                    {/if}
                                    {#if !box.is_locked}
                                        {#if effectiveAllowEdit}
                                            <button
                                                class="icon-button"
                                                title="Update"
                                                on:click={() =>
                                                    openUpdateBox(box)}
                                            >
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        {/if}
                                        {#if effectiveAllowDelete}
                                            <button
                                                class="icon-button delete"
                                                title="Delete"
                                                on:click={() =>
                                                    handleDeleteBox(box)}
                                            >
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        {/if}
                                    {:else}
                                        <span class="locked-badge">
                                            <i class="fas fa-lock"></i> Locked
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            {#if showUpdateBox === box}
                                <div class="form-card edit-overlay">
                                    <h3>Update Box</h3>
                                    <div class="form-group">
                                        <label for="edit-amount"
                                            >Amount (Max: {editingMaxAmount})</label
                                        >
                                        <input
                                            id="edit-amount"
                                            type="number"
                                            bind:value={editingAmount}
                                            min="1"
                                            max={editingMaxAmount}
                                        />
                                        {#if editingAmount > editingMaxAmount}
                                            <p class="warning-text">
                                                Amount exceeds available balance
                                                in main box.
                                            </p>
                                        {/if}
                                    </div>
                                    <div class="form-group">
                                        <label for="edit-content">Content</label
                                        >
                                        <div class="editor-toggle">
                                            <button
                                                class="toggle-btn"
                                                class:active={editorMode ===
                                                    "text"}
                                                on:click={() =>
                                                    setEditorMode("text")}
                                                >Text</button
                                            >
                                            <button
                                                class="toggle-btn"
                                                class:active={editorMode ===
                                                    "kv"}
                                                on:click={() =>
                                                    setEditorMode("kv")}
                                                >Key-Value</button
                                            >
                                            <button
                                                class="toggle-btn"
                                                class:active={editorMode ===
                                                    "json"}
                                                on:click={() =>
                                                    setEditorMode("json")}
                                                >Advanced JSON</button
                                            >
                                        </div>

                                        {#if editorMode === "text"}
                                            <textarea
                                                id="edit-content"
                                                bind:value={editingContent}
                                                placeholder="Enter text content..."
                                            ></textarea>
                                        {:else if editorMode === "kv"}
                                            <div class="kv-editor">
                                                {#each kvPairs as pair, i}
                                                    <div class="kv-row">
                                                        <input
                                                            type="text"
                                                            bind:value={
                                                                pair.key
                                                            }
                                                            placeholder="Key"
                                                        />
                                                        <input
                                                            type="text"
                                                            bind:value={
                                                                pair.value
                                                            }
                                                            placeholder="Value"
                                                        />
                                                        <button
                                                            class="remove-kv"
                                                            on:click={() =>
                                                                removeKVPair(i)}
                                                        >
                                                            <i
                                                                class="fas fa-times"
                                                            ></i>
                                                        </button>
                                                    </div>
                                                {/each}
                                                <button
                                                    class="add-kv-btn"
                                                    on:click={addKVPair}
                                                >
                                                    <i class="fas fa-plus"></i> Add
                                                    Pair
                                                </button>
                                            </div>
                                        {:else if editorMode === "json"}
                                            <textarea
                                                id="edit-content-json"
                                                class="mono"
                                                bind:value={editingContent}
                                                placeholder="Enter JSON content..."
                                            ></textarea>
                                        {/if}
                                    </div>
                                    <div class="form-actions">
                                        <button
                                            class="cancel-button"
                                            on:click={() =>
                                                (showUpdateBox = null)}
                                            >Cancel</button
                                        >
                                        <button
                                            class="primary-button"
                                            on:click={() =>
                                                handleUpdateBox(box)}
                                            disabled={isLoading}>Update</button
                                        >
                                    </div>
                                </div>
                            {/if}
                        {/each}
                    </div>
                    {#if displayedBoxes.length === 0}
                        <p class="no-results">No boxes found for this type.</p>
                    {/if}
                    {#if hasMoreBoxes}
                        <p class="more-boxes-hint">
                            Showing {maxBoxesVisible} of {filteredBoxes.length} boxes.
                        </p>
                    {/if}
                </section>
            {/if}
        {/if}
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

    /* --- Compact Mode --- */
    .profile-container.compact {
        padding: 1rem 0.75rem 2rem;
    }

    .profile-container.compact .hero-section {
        margin-bottom: 1.5rem;
    }

    .profile-container.compact .project-title {
        font-size: 1.75rem;
    }

    .profile-container.compact .subtitle {
        font-size: 0.95rem;
    }

    .profile-container.compact .section-title-row h3 {
        font-size: 1.25rem;
    }

    .profile-container.compact .box-card {
        padding: 0.75rem;
    }

    .profile-container.compact .assets-grid {
        gap: 1rem;
    }

    .profile-container.compact .asset-card {
        min-height: 120px;
        padding: 1rem;
    }

    .profile-container.compact .asset-amount {
        font-size: 1.5rem;
    }

    /* --- More Boxes Hint --- */
    .more-boxes-hint {
        text-align: center;
        color: #64748b;
        font-size: 0.875rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 0.5rem;
        margin-top: 1rem;
    }

    /* --- Refined Profile Switcher --- */
    .profile-switcher-v2 {
        margin-bottom: 2.5rem;
        position: relative;
        z-index: 100;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1.25rem;
        backdrop-filter: blur(12px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .profile-switcher-v2.expanded {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(251, 191, 36, 0.3);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .switcher-main-row {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        gap: 1rem;
    }

    .current-profile-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 1rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 0.75rem;
        transition: background 0.2s;
        /* Button reset styles */
        background: transparent;
        border: none;
        color: inherit;
        font: inherit;
        text-align: left;
        width: 100%;
    }

    .current-profile-info:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .profile-avatar {
        width: 2.5rem;
        height: 2.5rem;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #000;
        font-size: 1.25rem;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
    }

    .profile-meta {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .profile-types-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }

    .profile-type-badge {
        font-size: 0.6rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #000;
        background: #fbbf24;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
    }

    .profile-id-main {
        font-size: 1rem;
        font-weight: 600;
        color: #f1f5f9;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            monospace;
    }

    .chevron-icon {
        color: #64748b;
        font-size: 0.875rem;
        transition: transform 0.3s;
    }

    .expanded .chevron-icon {
        transform: rotate(180deg);
    }

    .create-profile-btn-v2 {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .create-profile-btn-v2:hover {
        background: rgba(251, 191, 36, 0.1);
        border-color: #fbbf24;
        color: #fbbf24;
    }

    /* --- Dropdown --- */
    .profiles-dropdown {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 1rem;
        max-height: 300px;
        overflow-y: auto;
    }

    .dropdown-header {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 0.75rem;
        padding-left: 0.5rem;
    }

    .dropdown-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
        text-align: left;
    }

    .dropdown-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .dropdown-item.active {
        background: rgba(251, 191, 36, 0.05);
        border-color: rgba(251, 191, 36, 0.2);
    }

    .item-icon {
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
    }

    .active .item-icon {
        background: rgba(251, 191, 36, 0.1);
        color: #fbbf24;
    }

    .item-content {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .item-top {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .item-types {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
    }

    .item-type {
        font-size: 0.75rem;
        font-weight: 600;
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
        padding: 0.05rem 0.3rem;
        border-radius: 3px;
    }

    .item-id {
        font-size: 0.75rem;
        color: #64748b;
        font-family: ui-monospace, monospace;
    }

    .item-erg {
        font-size: 0.75rem;
        color: #94a3b8;
    }

    .check-icon {
        color: #fbbf24;
        font-size: 0.875rem;
    }

    .terminology-tip {
        margin-left: 0.5rem;
        color: #64748b;
        cursor: help;
        font-size: 0.875rem;
    }

    .terminology-tip:hover {
        color: #fbbf24;
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
        width: 100%;
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
        padding-top: 1rem;
    }

    .locked-badge {
        font-size: 0.75rem;
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.05);
        padding: 0.25rem 0.6rem;
        border-radius: 2rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: 500;
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
    .filter-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .secondary-filters-column {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .secondary-filters {
        display: flex;
        align-items: center;
        width: 100%;
    }

    .filter-group-with-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
    }

    .locked-filter-group {
        display: flex;
        gap: 0.5rem;
        flex: 1;
    }

    .locked-filter-group .filter-badge {
        flex: 1;
        justify-content: center;
    }

    .self-filter {
        flex: 1;
        justify-content: center;
    }

    .self-filter.active {
        background: rgba(16, 185, 129, 0.1);
        border-color: #10b981;
        color: #10b981;
    }

    .info-tooltip {
        color: #64748b;
        cursor: help;
        font-size: 1.1rem;
        transition: color 0.2s;
    }

    .info-tooltip:hover {
        color: #fbbf24;
    }

    .main-action-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #3b82f6;
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.25rem 0.5rem;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 6px;
    }

    .main-badge {
        font-size: 0.6rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #fff;
        background: #3b82f6;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        margin-left: 0.5rem;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
    }

    .main-selector {
        color: #64748b;
    }

    .main-selector:hover {
        color: #3b82f6 !important;
        background: rgba(59, 130, 246, 0.1) !important;
    }
    .warning-text {
        color: #ef4444;
        font-size: 0.75rem;
        margin-top: 0.25rem;
    }

    /* --- Editor Toggle --- */
    .editor-toggle {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .toggle-btn {
        padding: 0.4rem 0.8rem;
        border-radius: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .toggle-btn:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .toggle-btn.active {
        background: #fbbf24;
        color: #000;
        border-color: #fbbf24;
    }

    /* --- KV Editor --- */
    .kv-editor {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .kv-row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .kv-row input {
        flex: 1;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.5rem;
        padding: 0.5rem;
        color: #fff;
        font-size: 0.875rem;
    }

    .remove-kv {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 0.25rem;
        transition: color 0.2s;
    }

    .remove-kv:hover {
        color: #ef4444;
    }

    .add-kv-btn {
        margin-top: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px dashed rgba(255, 255, 255, 0.2);
        color: #94a3b8;
        padding: 0.5rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
    }

    .add-kv-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: #fbbf24;
        color: #fbbf24;
    }

    textarea.mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            monospace;
    }

    /* --- Sacrifice Form --- */
    .sacrifice-toggle-btn {
        background: rgba(251, 191, 36, 0.1);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.3);
        padding: 0.4rem 0.8rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
        margin-left: auto;
    }

    .sacrifice-toggle-btn:hover {
        background: rgba(251, 191, 36, 0.2);
        border-color: #fbbf24;
    }

    .sacrifice-form {
        margin-bottom: 2rem;
        animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .sacrifice-form h4 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: #fbbf24;
    }

    .small-text {
        font-size: 0.875rem;
        color: #94a3b8;
        margin-bottom: 1.5rem;
    }

    .sacrifice-form .form-group input {
        width: 100%;
        background: #171717;
        border: 1px solid #404040;
        color: #fff;
        padding: 0.6rem;
        border-radius: 0.375rem;
        font-family: inherit;
    }

    .sacrifice-form .form-group input:focus {
        outline: none;
        border-color: #fbbf24;
        box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.1);
    }

    /* --- Multi-Token Sacrifice --- */
    .selected-tokens-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .selected-token-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: rgba(255, 255, 255, 0.03);
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .token-info-mini {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .token-info-mini .token-name {
        font-weight: 600;
        color: #f1f5f9;
        font-size: 0.875rem;
    }

    .token-info-mini .token-max {
        font-size: 0.7rem;
        color: #64748b;
    }

    .selected-token-item input {
        width: 100px !important;
        padding: 0.4rem !important;
        font-size: 0.875rem !important;
    }

    .remove-token-btn {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        transition: color 0.2s;
    }

    .remove-token-btn:hover {
        color: #ef4444;
    }

    .token-selector-container {
        position: relative;
    }

    .add-token-trigger {
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px dashed rgba(255, 255, 255, 0.2);
        color: #94a3b8;
        padding: 0.75rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .add-token-trigger:hover {
        background: rgba(251, 191, 36, 0.05);
        border-color: #fbbf24;
        color: #fbbf24;
    }

    .token-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        left: 0;
        width: 100%;
        background: #262626;
        border: 1px solid #404040;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        z-index: 50;
        max-height: 200px;
        overflow-y: auto;
        padding: 0.5rem;
    }

    .dropdown-option {
        width: 100%;
        display: flex;
        justify-content: space-between;
        padding: 0.6rem 0.75rem;
        background: transparent;
        border: none;
        color: #e2e8f0;
        cursor: pointer;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        transition: background 0.2s;
    }

    .dropdown-option:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.05);
    }

    .dropdown-option:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .opt-amount {
        color: #64748b;
        font-family: ui-monospace, monospace;
    }

    .dropdown-empty {
        text-align: center;
        color: #64748b;
        font-size: 0.875rem;
        padding: 1rem;
    }
</style>
