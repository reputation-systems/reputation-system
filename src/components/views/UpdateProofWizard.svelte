<script lang="ts">
    import { onMount } from 'svelte';
    import { generate_reputation_proof } from '$lib/generate_reputation_proof';
    import { types, proofs } from '$lib/store';
    import type { RPBox } from '$lib/ReputationProof';

    // --- WIZARD STATE ---
    let currentStep = 1;
    const totalSteps = 6;

    // --- FORM DATA ---
    let proof_to_update_id: string = '';
    let object_to_assign: string = '';
    let token_amount: number = 100;
    let is_negative: boolean = false;
    let data: object|string|null = null;
    let is_locked: boolean = false;
    let contentString: string = '';

    // --- UI STATE ---
    let isLoading = false;
    let errorMessage = '';
    let successMessage = '';
    
    // --- REACTIVE LOGIC ---
    $: selectedProof = proof_to_update_id ? $proofs.get(proof_to_update_id) : null;
    
    // Encuentra la caja principal (que se apunta a sí misma) para gastar los tokens.
    let spendable_box: RPBox | undefined;
    $: {
        if (selectedProof) {
            spendable_box = selectedProof.current_boxes.find(
                box => box.object_pointer === selectedProof?.token_id
            );
        } else {
            spendable_box = undefined;
        }
    }

    function nextStep() { if (currentStep < totalSteps) currentStep++; }
    function prevStep() { if (currentStep > 1) currentStep--; }

    async function handleSubmit() {
        isLoading = true;
        errorMessage = '';
        successMessage = '';
        
        if (!selectedProof || !object_to_assign || token_amount <= 0) {
            errorMessage = "Please fill in all required fields.";
            isLoading = false;
            return;
        }

        // Validar que la caja desde la que gastamos tokens exista.
        if (!spendable_box) {
            errorMessage = "The selected proof has no unassigned tokens available to create a new opinion.";
            isLoading = false;
            return;
        }

        // Validar que la cantidad no exceda los tokens disponibles en esa caja.
        if (token_amount > spendable_box.token_amount) {
            errorMessage = `The amount cannot exceed the available supply in the main box (${spendable_box.token_amount}).`;
            isLoading = false;
            return;
        }

        try {
            const txId = await generate_reputation_proof(
                token_amount,
                selectedProof.total_amount,
                selectedProof.type.tokenId,
                object_to_assign,
                !is_negative,
                data,
                is_locked,
                spendable_box
            );

            if (txId) {
                successMessage = `Proof updated successfully! Transaction ID: ${txId}`;
            } else {
                errorMessage = 'Transaction was submitted, but no transaction ID was returned.';
            }
        } catch (e: any) {
            errorMessage = `Error sending transaction: ${e.message || e.info || 'Unknown error. Check the console.'}`;
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
</script>

<div class="wizard-container">
    <header class="wizard-header">
        <h2>Update an Existing Proof</h2>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: {((currentStep - 1) / (totalSteps - 1)) * 100}%" />
        </div>
    </header>
    
    <div class="step-content">
        {#if currentStep === 1}
            <h4>Step 1: Select Proof to Update</h4>
            <label for="proof-select">Your Proofs<span class="required">*</span></label>
            <select id="proof-select" class="input" bind:value={proof_to_update_id} required>
                <option value="" disabled>-- Choose one of your proofs --</option>
                {#each Array.from($proofs.values()) as proof (proof.token_id)}
                    {#if proof.can_be_spend}
                        <option value={proof.token_id}>
                            {proof.type.typeName} (Total: {proof.total_amount}) - ID: {proof.token_id.substring(0, 10)}...
                        </option>
                    {/if}
                {/each}
            </select>
            {#if $proofs.size === 0}
                <p class="help-text error-text">You do not own any reputation proofs to update.</p>
            {/if}
            {#if selectedProof}
                {#if spendable_box}
                    <p class="help-text">Tokens available to assign: {spendable_box.token_amount}</p>
                {:else}
                    <p class="help-text error-text">Warning: This proof has no unassigned tokens. You cannot add new opinions.</p>
                {/if}
            {/if}
        {/if}

        {#if currentStep === 2}
            <h4>Step 2: Define New Pointer</h4>
            <label for="object-assign-input">Object to Evaluate<span class="required">*</span></label>
            <input id="object-assign-input" type="text" class="input" bind:value={object_to_assign} placeholder="URL, another token ID, text, etc." required />
             <p class="help-text">What is this new opinion about? You can point to any on-chain or off-chain object.</p>
        {/if}

        {#if currentStep === 3}
            <h4>Step 3: Assign Weight & Opinion</h4>
            <label for="token-amount">Amount of Tokens to Assign to this Opinion<span class="required">*</span></label>
            <input id="token-amount" type="number" class="input" bind:value={token_amount} min="1" max={spendable_box?.token_amount} step="1" />
            {#if spendable_box}
                <p class="help-text">This amount will be deducted from the unassigned supply (Available: {spendable_box.token_amount}).</p>
            {/if}
            <div class="polarity-buttons">
                <button class:selected={!is_negative} on:click={() => is_negative = false}>👍 Positive</button>
                <button class:selected={is_negative} on:click={() => is_negative = true}>👎 Negative</button>
            </div>
        {/if}

        {#if currentStep === 4}
            <h4>Step 4: Add Content (Optional)</h4>
            <label for="content-data">Additional Data (Plain Text or JSON):</label>
            <textarea id="content-data" class="input" rows="15" bind:value={contentString} placeholder="Enter plain text or a valid JSON object..."/>
        {/if}

        {#if currentStep === 5}
             <h4>Step 5: Options</h4>
             <div class="form-check">
                <input type="checkbox" class="form-check-input" id="lock-checkbox" bind:checked={is_locked} />
                <label for="lock-checkbox" class="form-check-label">Lock this new opinion (make it immutable)</label>
            </div>
        {/if}

        {#if currentStep === 6}
            <h4>Step 6: Summary and Submit</h4>
            <div class="summary">
                <p><strong>Updating Proof:</strong> <span>{selectedProof?.type.typeName ?? 'Unknown'} ({selectedProof?.token_id.substring(0,10)}...)</span></p>
                <p><strong>New Pointer:</strong> <span>{object_to_assign}</span></p>
                <p><strong>Opinion:</strong> {is_negative ? 'Negative' : 'Positive'} ({token_amount.toLocaleString()} tokens)</p>
                <p><strong>Content:</strong> <span>{contentString || 'Not provided'}</span></p>
                <p><strong>New Opinion will be locked:</strong> {is_locked ? 'Yes' : 'No'}</p>
            </div>
            {#if isLoading}
                <div class="feedback loading">Sending transaction... Please check your wallet.</div>
            {:else if successMessage}
                <div class="feedback success">{successMessage}</div>
            {:else if errorMessage}
                <div class="feedback error">{errorMessage}</div>
            {/if}
            <button class="submit-button" on:click={handleSubmit} disabled={isLoading || !!successMessage}>
                Sign and Update Proof
            </button>
        {/if}
    </div>

    <div class="wizard-nav">
        <button on:click={prevStep} disabled={currentStep === 1}>&larr; Previous</button>
        <button on:click={nextStep} disabled={currentStep === totalSteps || !proof_to_update_id || !spendable_box}>Next &rarr;</button>
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
        color: #FBBF24; 
        margin: 0 0 1.5rem 0; 
    }
    h4 {
        text-align: center;
        color: #f0f0f0;
        font-size: 1.2rem;
        font-weight: 500;
    }

    .progress-bar { width: 100%; background-color: #3a3a3a; border-radius: 5px; height: 10px; }
    .progress-bar-fill { height: 100%; background-color: #FBBF24; border-radius: 5px; transition: width 0.3s; }
    
    .step-content {
        flex-grow: 1;
        overflow-y: auto;
        padding: 0 0.5rem;
    }

    .input, select, label { display: block; width: 100%; box-sizing: border-box; }
    label { margin-bottom: 0.25rem; font-weight: bold; color: #ccc; }
    .input, select { padding: 0.75rem; background: #333; border: 1px solid #666; border-radius: 6px; color: #f0f0f0; font-family: inherit; font-size: 1rem; }
    select:disabled { background-color: #444; cursor: not-allowed; }
    .help-text { font-size: 0.9rem; color: #aaa; margin-top: 0.75rem; border-left: 3px solid #FBBF24; padding-left: 1rem; }
    .polarity-buttons { display: flex; gap: 1rem; margin: 1rem 0; }
    .polarity-buttons button { flex-grow: 1; padding: 1rem; background: #444; border: 2px solid #666; color: white; border-radius: 6px; cursor: pointer; transition: border-color 0.2s; }
    .polarity-buttons button.selected { border-color: #FBBF24; }
    .summary { background: #333; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; word-break: break-all; max-height: 250px; overflow-y: auto;}
    .summary p { margin: 0.5rem 0; color: #ccc;}
    .summary span { color: #f0f0f0; font-family: monospace; white-space: pre-wrap; }
    .feedback { padding: 1rem; border-radius: 6px; margin: 1rem 0; text-align: center; color: white; }
    .feedback.loading { background-color: rgba(59, 89, 152, 0.8); }
    .feedback.success { background-color: rgba(76, 175, 80, 0.8); }
    .feedback.error { background-color: rgba(244, 67, 54, 0.8); }

    .wizard-nav { 
        display: flex; 
        justify-content: space-between; 
        margin-top: 2rem; 
        border-top: 1px solid #444; 
        padding-top: 1.5rem;
        flex-shrink: 0;
    }
    .wizard-nav button, .submit-button { padding: 0.75rem 1.5rem; border: none; color: #1a1a1a; background: #FBBF24; border-radius: 6px; cursor: pointer; font-weight: bold; }
    .wizard-nav button:disabled, .submit-button:disabled { background-color: #555; color: #888; cursor: not-allowed; }
    
    .form-check { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; }
    .form-check-input { width: 1.25em; height: 1.25em; }
    .required { color: #ff8a8a; margin-left: 4px; }
</style>