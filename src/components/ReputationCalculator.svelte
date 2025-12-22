<script lang="ts">
    import { writable } from "svelte/store";
    import {
        SvelteFlow,
        Background,
        Controls,
        MiniMap,
        type Node,
        type Edge,
    } from "@xyflow/svelte";
    import { type ReputationProof, compute } from "$lib/ReputationProof";
    import ReputationNode from "./graph/ReputationNode.svelte";
    // Import the specific Type NFT ID from your environment variables.

    export let proofs: Map<string, ReputationProof>;
    export let computeDeepLevel: number;

    const nodeTypes = { reputation: ReputationNode };
    const nodes = writable<Node[]>([]);
    const edges = writable<Edge[]>([]);

    let objectToCalculate: string = "";
    let finalScore: number | null = null;
    let isLoading = false;

    function calculateAndBuildGraph() {
        isLoading = true;
        finalScore = null;
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const visitedProofs = new Set<string>();
        let layoutY = 0;
        let layoutX = 0;

        function buildGraphRecursive(
            proof: ReputationProof,
            deepLevel: number,
            parentX = 0,
        ) {
            if (!proof || deepLevel < 0 || visitedProofs.has(proof.token_id))
                return;
            visitedProofs.add(proof.token_id);

            newNodes.push({
                id: proof.token_id,
                type: "reputation",
                position: { x: parentX + layoutX, y: layoutY },
                data: { label: proof.type.typeName, tokenId: proof.token_id },
            });

            if (proof.type.isRepProof) {
                let childCount = 0;
                for (const box of proof.current_boxes) {
                    //
                    // CORRECTO: Usa get(store) para acceder al valor
                    const targetProof = proofs.get(box.object_pointer);
                    if (targetProof) {
                        const proportion =
                            box.token_amount / proof.total_amount; //
                        newEdges.push({
                            id: `e-${proof.token_id}-${box.object_pointer}`,
                            source: proof.token_id,
                            target: box.object_pointer,
                            label: `${(proportion * 100).toFixed(1)}% ${box.polarization ? "(+)" : "(-)"}`, //
                            animated: true,
                            style: `stroke: ${!box.polarization ? "#f44336" : "#4caf50"}; stroke-width: ${1 + proportion * 8};`,
                        });
                        layoutY += 200;
                        buildGraphRecursive(
                            targetProof,
                            deepLevel - 1,
                            parentX + childCount * 250 - 125,
                        );
                        layoutY -= 200;
                        childCount++;
                    }
                }
            }
            layoutX += 250;
        }

        newNodes.push({
            id: "target-object",
            type: "output",
            position: { x: 0, y: -150 },
            data: { label: `Objeto: ${objectToCalculate.substring(0, 20)}...` },
        });

        let totalScore = 0;
        // CORRECTO: Usa get(store) para iterar sobre los valores
        for (const proof of proofs.values()) {
            const score = compute(proof, objectToCalculate); //
            if (score !== 0) {
                totalScore += score;
                newEdges.push({
                    id: `e-${proof.token_id}-target`,
                    source: proof.token_id,
                    target: "target-object",
                    label: `Aporta ${score.toFixed(3)}`,
                    style: `stroke: ${score < 0 ? "#f44336" : "#4caf50"};`,
                });
                // CORRECTO: Usa get() para pasar el valor
                buildGraphRecursive(proof, computeDeepLevel);
                layoutY = 0;
            }
        }

        nodes.set(newNodes);
        edges.set(newEdges);
        finalScore = totalScore;
        isLoading = false;
    }
</script>

<div class="calculator-container">
    <h2>Calculadora de Reputación Visual</h2>
    <div class="input-form">
        <input
            class="input"
            bind:value={objectToCalculate}
            placeholder="ID del token, URL, hash..."
        />

        <button
            on:click={calculateAndBuildGraph}
            disabled={isLoading || !objectToCalculate}
        >
            {isLoading ? "Calculando..." : "Calcular y Dibujar Grafo"}
        </button>
    </div>
    {#if finalScore !== null}
        <div class="results">
            <h3>
                Puntuación Total:
                <span
                    class:positive={finalScore > 0}
                    class:negative={finalScore < 0}
                >
                    {finalScore.toFixed(4)}
                </span>
            </h3>
        </div>
    {/if}
    <div class="graph-wrapper">
        <SvelteFlow {nodes} {edges} {nodeTypes} fitView>
            <Background />
            <Controls />
            <MiniMap />
        </SvelteFlow>
    </div>
</div>

<style>
    .calculator-container {
        padding: 2rem;
        max-width: 100%;
        margin: auto;
    }
    .input-form {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
        margin-bottom: 2rem;
    }
    .input {
        padding: 0.75rem;
        background: #333;
        border: 1px solid #666;
        border-radius: 6px;
        color: #f0f0f0;
        flex-grow: 1;
        max-width: 400px;
    }
    button {
        padding: 0.75rem 1.5rem;
    }
    .results h3 {
        text-align: center;
        font-size: 1.5rem;
    }
    .results span.positive {
        color: #4caf50;
    }
    .results span.negative {
        color: #f44336;
    }
    .graph-wrapper {
        width: 100%;
        height: 70vh;
        background: #222;
        border: 1px solid #444;
        border-radius: 8px;
    }
</style>
