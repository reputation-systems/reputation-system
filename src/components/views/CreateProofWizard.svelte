<script lang="ts">
    import { create_profile } from "$lib/create_profile";
    import { explorer_uri } from "$lib/envs";
    import type { ReputationProof, TypeNFT } from "$lib/ReputationProof";

    export let connected: boolean;
    export let types: Map<string, TypeNFT>;

    let currentStep = 1;
    const totalSteps = 4;

    let type_nft_id: string = "";
    let token_amount: number = 1000000;
    let data: object | string | null = null;
    let contentString: string = "";

    let isLoading = false;
    let errorMessage = "";
    let successMessage = "";

    function nextStep() {
        if (currentStep < totalSteps) currentStep++;
    }
    function prevStep() {
        if (currentStep > 1) currentStep--;
    }

    async function handleSubmit() {
        isLoading = true;
        errorMessage = "";
        successMessage = "";

        if (!type_nft_id || token_amount <= 0) {
            errorMessage =
                "Please fill in all required fields: Type NFT Standard and Token Amount.";
            isLoading = false;
            return;
        }

        try {
            const txId = await create_profile(
                explorer_uri,
                token_amount,
                type_nft_id,
                data,
            );

            if (txId) {
                successMessage = `New reputation proof minted! Transaction ID: ${txId}`;
            } else {
                errorMessage =
                    "Transaction was submitted, but no transaction ID was returned.";
            }
        } catch (e: any) {
            errorMessage = `Error sending transaction: ${e.message || e.info || "Unknown error. Check the console."}`;
            console.error(e);
        } finally {
            isLoading = false;
        }
    }

    $: {
        const value = contentString.trim();
        if (!value) {
            data = null;
        } else {
            try {
                data = JSON.parse(value);
            } catch (e) {
                data = value;
            }
        }
    }

    $: selectedType = type_nft_id ? types.get(type_nft_id) : null;
</script>

<div class="wizard-container">
    <header class="wizard-header">
        <h2>Create New Reputation Proof</h2>
        <div class="progress-bar">
            <div
                class="progress-bar-fill"
                style="width: {((currentStep - 1) / (totalSteps - 1)) * 100}%"
            />
        </div>
    </header>

    <div class="step-content">
        {#if currentStep === 1}
            <h4>Step 1: Choose Proof Standard</h4>
            <label for="type-nft-select"
                >Type NFT Standard<span class="required">*</span></label
            >
            <select
                id="type-nft-select"
                class="input"
                bind:value={type_nft_id}
                required
                disabled={isLoading}
            >
                <option value="" disabled selected>
                    -- Please choose a standard --
                </option>
                {#each Array.from(types.values()) as type (type.tokenId)}
                    <option value={type.tokenId}>
                        {type.typeName} - {type.tokenId.slice(0, 6)}
                    </option>
                {/each}
            </select>
            {#if types.size === 0}
                <p class="help-text error-text">
                    No types found. Please go to "Manage Types" to create one
                    first.
                </p>
            {/if}
            {#if selectedType}
                <p class="help-text">{selectedType.description}</p>
            {/if}
        {/if}

        {#if currentStep === 2}
            <h4>Step 2: Set Initial Token Amount</h4>
            <label for="token-amount"
                >Amount of Tokens to Mint<span class="required">*</span></label
            >
            <input
                id="token-amount"
                type="number"
                class="input"
                bind:value={token_amount}
                min="1"
                step="1"
            />
        {/if}

        {#if currentStep === 3}
            <h4>Step 3: Add Content (Optional)</h4>
            <label for="content-data"
                >Additional Data (Plain Text or JSON):</label
            >
            <textarea
                id="content-data"
                class="input"
                rows="15"
                bind:value={contentString}
                placeholder="Enter plain text or a valid JSON object..."
            />
        {/if}

        {#if currentStep === 4}
            <h4>Step 4: Summary and Submit</h4>
            <div class="summary">
                <p>
                    <strong>Standard (Type NFT):</strong>
                    <span>{selectedType?.typeName ?? "Unknown Type"}</span>
                </p>
                <p>
                    <strong>Initial Pointer:</strong>
                    <span>Self (this new proof)</span>
                </p>
                <p>
                    <strong>Opinion:</strong>
                    Positive ({token_amount.toLocaleString()} tokens to mint)
                </p>
                <p>
                    <strong>Content:</strong>
                    <span>{contentString || "Not provided"}</span>
                </p>
            </div>
            {#if isLoading}
                <div class="feedback loading">
                    Sending transaction... Please check your wallet.
                </div>
            {:else if successMessage}
                <div class="feedback success">{successMessage}</div>
            {:else if errorMessage}
                <div class="feedback error">{errorMessage}</div>
            {/if}
            <button
                class="submit-button"
                on:click={handleSubmit}
                disabled={isLoading || !!successMessage}
            >
                Sign and Mint Proof
            </button>
        {/if}
    </div>

    <div class="wizard-nav">
        <button on:click={prevStep} disabled={currentStep === 1}
            >&larr; Previous</button
        >
        <button
            on:click={nextStep}
            disabled={currentStep === totalSteps || !type_nft_id}
            >Next &rarr;</button
        >
    </div>
</div>

<style>
    .error-text {
        color: #ff8a8a !important;
    }
    .wizard-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }

    .wizard-header {
        text-align: center;
        padding-bottom: 1.5rem;
        margin-bottom: 2rem;
        border-bottom: 1px solid #444;
        flex-shrink: 0;
    }

    h2 {
        color: #fbbf24;
        margin: 0 0 1.5rem 0;
    }
    h4 {
        text-align: center;
        color: #f0f0f0;
        font-size: 1.2rem;
        font-weight: 500;
    }

    .progress-bar {
        width: 100%;
        background-color: #3a3a3a;
        border-radius: 5px;
        height: 10px;
    }
    .progress-bar-fill {
        height: 100%;
        background-color: #fbbf24;
        border-radius: 5px;
        transition: width 0.3s;
    }

    .step-content {
        flex-grow: 1;
        overflow-y: auto;
        padding: 0 0.5rem;
    }
    .input,
    select,
    label {
        display: block;
        width: 100%;
        box-sizing: border-box;
    }
    label {
        margin-bottom: 0.25rem;
        font-weight: bold;
        color: #ccc;
    }
    .input,
    select {
        padding: 0.75rem;
        background: #333;
        border: 1px solid #666;
        border-radius: 6px;
        color: #f0f0f0;
        font-family: inherit;
        font-size: 1rem;
    }
    select:disabled {
        background-color: #444;
        cursor: not-allowed;
    }
    .help-text {
        font-size: 0.9rem;
        color: #aaa;
        margin-top: 0.75rem;
        border-left: 3px solid #fbbf24;
        padding-left: 1rem;
    }

    .summary {
        background: #333;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        word-break: break-all;
        max-height: 250px;
        overflow-y: auto;
    }
    .summary p {
        margin: 0.5rem 0;
        color: #ccc;
    }
    .summary span {
        color: #f0f0f0;
        font-family: monospace;
        white-space: pre-wrap;
    }

    .feedback {
        padding: 1rem;
        border-radius: 6px;
        margin: 1rem 0;
        text-align: center;
        color: white;
    }
    .feedback.loading {
        background-color: rgba(59, 89, 152, 0.8);
    }
    .feedback.success {
        background-color: rgba(76, 175, 80, 0.8);
    }
    .feedback.error {
        background-color: rgba(244, 67, 54, 0.8);
    }

    .wizard-nav {
        display: flex;
        justify-content: space-between;
        margin-top: 2rem;
        border-top: 1px solid #444;
        padding-top: 1.5rem;
        flex-shrink: 0;
    }
    .wizard-nav button,
    .submit-button {
        padding: 0.75rem 1.5rem;
        border: none;
        color: #1a1a1a;
        background: #fbbf24;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
    }
    .wizard-nav button:disabled,
    .submit-button:disabled {
        background-color: #555;
        color: #888;
        cursor: not-allowed;
    }

    .required {
        color: #ff8a8a;
        margin-left: 4px;
    }
</style>
