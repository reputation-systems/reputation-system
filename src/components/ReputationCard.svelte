<script lang="ts">
	import type { RPBox } from "$lib/ReputationProof";
	import { hexToUtf8 } from "$lib/utils";

	export let box: RPBox;
	export let totalAmount: number;

	let detailsVisible = false;
	$: proportion =
		totalAmount > 0 ? (box.token_amount / totalAmount) * 100 : 0;
	$: displayValue =
		typeof box.content === "string"
			? box.content
			: box.object_pointer || "N/A";
</script>

<div class="card" class:negative={!box.polarization}>
	<div class="card-header">
		<span class="polarity-icon">{box.polarization ? "👍" : "👎"}</span>
		<span class="object-type">{box.type.typeName || "PlainText"}</span>
	</div>
	<div class="card-body">
		<p class="object-value" title={displayValue}>{displayValue}</p>
	</div>
	<div class="card-footer">
		<div class="token-info">
			<span class="token-amount"
				>{box.token_amount.toLocaleString()} Tokens</span
			>
			<div class="proportion-bar-container">
				<div class="proportion-bar" style="width: {proportion}%" />
			</div>
		</div>
		<button
			class="details-button"
			on:click={() => (detailsVisible = !detailsVisible)}
		>
			{detailsVisible ? "Ocultar Detalles" : "Ver Detalles"}
		</button>
	</div>
	{#if detailsVisible}
		<div class="details-section">
			<p>
				<strong>Box ID:</strong> <span class="mono">{box.box_id}</span>
			</p>
			{#if box.content && typeof box.content === "object" && Object.keys(box.content).length > 0}
				<strong>Datos Adicionales (R9):</strong>
				<pre>{JSON.stringify(box.content, null, 2)}</pre>
			{/if}
		</div>
	{/if}
</div>

<style>
	.card {
		background: #2f2f2f;
		border: 1px solid #555;
		border-left: 5px solid #4caf50;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
	}
	.card.negative {
		border-left-color: #f44336;
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.polarity-icon {
		font-size: 1.5rem;
	}
	.object-type {
		font-size: 0.8rem;
		background: #444;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
	}
	.card-body .object-value {
		font-size: 1.1rem;
		font-weight: bold;
		word-wrap: break-word;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		margin: 0.5rem 0 1rem 0;
		min-height: 44px;
	}
	.card-footer {
		margin-top: auto;
	}
	.token-info {
		margin-bottom: 1rem;
	}
	.token-amount {
		font-size: 0.9rem;
	}
	.proportion-bar-container {
		width: 100%;
		background: #555;
		border-radius: 4px;
		height: 8px;
		margin-top: 0.5rem;
	}
	.proportion-bar {
		height: 100%;
		background: #4caf50;
		border-radius: 4px;
	}
	.card.negative .proportion-bar {
		background: #f44336;
	}
	.details-button {
		width: 100%;
		background: #4a4a4a;
		border: none;
		color: white;
		padding: 0.5rem;
		border-radius: 6px;
		cursor: pointer;
	}
	.details-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #444;
		font-size: 0.8rem;
		word-break: break-all;
	}
	.details-section .mono {
		font-family: monospace;
	}
	.details-section pre {
		background-color: #222;
		padding: 0.5rem;
		border-radius: 4px;
		white-space: pre-wrap;
	}
</style>
