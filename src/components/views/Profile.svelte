<script lang="ts">
    import { onMount } from "svelte";
    import { connected, reputation_proof } from "$lib/store";
    import { fetchProfile } from "$lib/profileFetch";
    import { generate_reputation_proof } from "$lib/generate_reputation_proof";
    import { PROFILE_TYPE_NFT_ID } from "$lib/envs";
    import type { ReputationProof, RPBox } from "$lib/ReputationProof";

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

    onMount(async () => {
        await refreshProfile();
    });

    async function refreshProfile() {
        isLoading = true;
        try {
            // @ts-ignore
            await fetchProfile(window.ergo);
        } catch (e: any) {
            errorMessage = `Error fetching profile: ${e.message}`;
        } finally {
            isLoading = false;
        }
    }

    $: mainBox = $reputation_proof?.current_boxes.find(
        (b) => b.object_pointer === $reputation_proof?.token_id,
    );
    $: totalErg =
        $reputation_proof?.current_boxes.reduce(
            (acc, b) => acc + BigInt(b.box.value),
            BigInt(0),
        ) ?? BigInt(0);

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

    async function handleAddBox() {
        if (!$reputation_proof || !mainBox) return;

        isLoading = true;
        errorMessage = "";
        try {
            // To add a box, we spend from the main box.
            // The main box will be split: one part stays as main box, another part becomes the new box.
            const txId = await generate_reputation_proof(
                newBoxAmount,
                $reputation_proof.total_amount,

                PROFILE_TYPE_NFT_ID,
                newBoxPointer,
                newBoxPolarization,
                newBoxContent,
                false,
                mainBox,
            );
            if (txId) {
                successMessage = `Add box transaction submitted: ${txId}`;
                showAddBox = false;
            }
        } catch (e: any) {
            errorMessage = `Error adding box: ${e.message}`;
        } finally {
            isLoading = false;
        }
    }

    async function handleUpdateBox(box: RPBox) {
        isLoading = true;
        errorMessage = "";
        try {
            const txId = await generate_reputation_proof(
                box.token_amount,
                $reputation_proof!.total_amount,

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
        if (!$reputation_proof || !mainBox) return;

        isLoading = true;
        errorMessage = "";
        try {
            // To delete a box, we merge it back into the main box.
            // input_proof = mainBox
            // extra_inputs = [box]
            // token_amount = mainBox.amount + box.amount
            const txId = await generate_reputation_proof(
                mainBox.token_amount + box.token_amount,
                $reputation_proof.total_amount,

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

    function formatErg(nanoErg: bigint): string {
        return (Number(nanoErg) / 1000000000).toFixed(4);
    }
</script>

<div class="profile-container">
    <h1 class="title">User Profile</h1>

    {#if !$connected}
        <div class="info-card">
            <p>Please connect your wallet to view or create your profile.</p>
        </div>
    {:else if isLoading && !$reputation_proof}
        <div class="loading-spinner">Loading profile...</div>
    {:else if !$reputation_proof}
        <div class="no-profile">
            <p>You don't have a reputation profile yet.</p>
            <button
                class="primary-button"
                on:click={handleCreateProfile}
                disabled={isLoading}
            >
                Create Profile
            </button>
        </div>
    {:else}
        <div class="profile-header">
            <div class="profile-info">
                <p>
                    <strong>Token ID:</strong>
                    <span class="mono">{$reputation_proof.token_id}</span>
                </p>

                <p>
                    <strong>Total Responsibility (ERG):</strong>
                    <span class="highlight">{formatErg(totalErg)} ERG</span>
                </p>
            </div>
            <button
                class="secondary-button"
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

        <div class="boxes-section">
            <div class="section-header">
                <h2>Profile Boxes</h2>
                <button
                    class="add-button"
                    on:click={() => (showAddBox = !showAddBox)}
                >
                    <i class="fas fa-plus"></i> Add Box
                </button>
            </div>

            {#if showAddBox}
                <div class="form-card">
                    <h3>Add New Box</h3>
                    <div class="form-group">
                        <label>Amount</label>
                        <input
                            type="number"
                            bind:value={newBoxAmount}
                            min="1"
                            max={mainBox?.token_amount ?? 1}
                        />
                    </div>
                    <div class="form-group">
                        <label>Object Pointer (Token ID or URL)</label>
                        <input
                            type="text"
                            bind:value={newBoxPointer}
                            placeholder="0000... or https://..."
                        />
                    </div>
                    <div class="form-group">
                        <label>Content (JSON or String)</label>
                        <textarea bind:value={newBoxContent}></textarea>
                    </div>
                    <div class="form-group checkbox">
                        <label>
                            <input
                                type="checkbox"
                                bind:checked={newBoxPolarization}
                            />
                            Positive Polarization
                        </label>
                    </div>
                    <div class="form-actions">
                        <button
                            class="cancel-button"
                            on:click={() => (showAddBox = false)}>Cancel</button
                        >
                        <button
                            class="primary-button"
                            on:click={handleAddBox}
                            disabled={isLoading}>Submit</button
                        >
                    </div>
                </div>
            {/if}

            <div class="boxes-list">
                {#each $reputation_proof.current_boxes as box}
                    <div
                        class="box-card"
                        class:main={box.object_pointer ===
                            $reputation_proof.token_id}
                    >
                        <div class="box-details">
                            <div class="box-row">
                                <span class="label">Pointer:</span>
                                <span class="value mono"
                                    >{box.object_pointer ===
                                    $reputation_proof.token_id
                                        ? "SELF (Main Box)"
                                        : box.object_pointer}</span
                                >
                            </div>
                            <div class="box-row">
                                <span class="label">Amount:</span>
                                <span class="value"
                                    >{box.token_amount} tokens</span
                                >
                            </div>
                            <div class="box-row">
                                <span class="label">ERG:</span>
                                <span class="value"
                                    >{formatErg(BigInt(box.box.value))} ERG</span
                                >
                            </div>
                            {#if box.content}
                                <div class="box-row">
                                    <span class="label">Content:</span>
                                    <span class="value"
                                        >{typeof box.content === "object"
                                            ? JSON.stringify(box.content)
                                            : box.content}</span
                                    >
                                </div>
                            {/if}
                        </div>
                        <div class="box-actions">
                            <button
                                class="icon-button"
                                title="Update"
                                on:click={() => (showUpdateBox = box)}
                            >
                                <i class="fas fa-edit"></i>
                            </button>
                            {#if box.object_pointer !== $reputation_proof.token_id}
                                <button
                                    class="icon-button delete"
                                    title="Delete (Merge to Main)"
                                    on:click={() => handleDeleteBox(box)}
                                >
                                    <i class="fas fa-trash"></i>
                                </button>
                            {/if}
                        </div>
                    </div>

                    {#if showUpdateBox === box}
                        <div class="form-card edit">
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
        </div>
    {/if}
</div>

<style>
    .profile-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 2rem;
        color: #f0f0f0;
    }
    .title {
        color: #fbbf24;
        font-size: 2.5rem;
        margin-bottom: 2rem;
    }
    .mono {
        font-family: "Courier New", Courier, monospace;
        word-break: break-all;
    }
    .highlight {
        color: #fbbf24;
        font-weight: bold;
    }
    .profile-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        background: #2a2a2a;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid #444;
        margin-bottom: 2rem;
    }
    .profile-info p {
        margin: 0.5rem 0;
    }
    .boxes-section {
        margin-top: 3rem;
    }
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    .boxes-list {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    .box-card {
        background: #222;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: border-color 0.2s;
    }
    .box-card.main {
        border-color: #fbbf24;
        background: #2a261a;
    }
    .box-card:hover {
        border-color: #555;
    }
    .box-details {
        flex: 1;
    }
    .box-row {
        margin: 0.25rem 0;
        display: flex;
        gap: 0.5rem;
    }
    .label {
        color: #888;
        font-size: 0.9rem;
        min-width: 80px;
    }
    .value {
        color: #ddd;
    }
    .box-actions {
        display: flex;
        gap: 0.5rem;
    }
    .icon-button {
        background: #333;
        border: none;
        color: #ccc;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    .icon-button:hover {
        background: #444;
        color: #fff;
    }
    .icon-button.delete:hover {
        background: #522;
        color: #f88;
    }
    .primary-button {
        background: #fbbf24;
        color: #1a1a1a;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
    }
    .secondary-button {
        background: #444;
        color: #fff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
    }
    .add-button {
        background: #28a745;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
    }
    .form-card {
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }
    .form-group {
        margin-bottom: 1rem;
    }
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        color: #aaa;
    }
    .form-group input,
    .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 6px;
        color: #fff;
    }
    .form-group.checkbox label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
    }
    .form-group.checkbox input {
        width: auto;
    }
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1.5rem;
    }
    .cancel-button {
        background: transparent;
        border: 1px solid #444;
        color: #aaa;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
    }
    .feedback {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
    }
    .success {
        background: rgba(40, 167, 69, 0.2);
        border: 1px solid #28a745;
        color: #28a745;
    }
    .error {
        background: rgba(220, 53, 69, 0.2);
        border: 1px solid #dc3545;
        color: #dc3545;
    }
</style>
