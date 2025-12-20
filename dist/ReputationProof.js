import {} from "@fleet-sdk/core";
import { get } from 'svelte/store';
import { proofs, compute_deep_level } from "./store";
import { stringToRendered } from "./utils";
// --- ENUMS & UTILITIES ---
export function token_rendered(proof) {
    return stringToRendered(proof.token_id);
}
;
export var Network;
(function (Network) {
    Network["ErgoTestnet"] = "ergo-testnet";
    Network["ErgoMainnet"] = "ergo";
    Network["BitcoinTestnet"] = "btc-testnet";
    Network["BitcoinMainnet"] = "btc";
})(Network || (Network = {}));
// --- REPUTATION COMPUTATION LOGIC ---
export function compute(proof, target_object_pointer) {
    const all_proofs = get(proofs);
    return internal_compute(all_proofs, proof, target_object_pointer, get(compute_deep_level));
}
function internal_compute(all_proofs, proof, target_object_pointer, deep_level) {
    console.log(`Compute (deep_level: ${deep_level}) on proof: ${proof.type.typeName} (${proof.token_id})`);
    return proof.current_boxes.reduce((total, box) => {
        if (proof.total_amount === 0)
            return total; // Avoid division by zero
        const proportion = box.token_amount / proof.total_amount;
        const boxReputation = computeBoxReputation(all_proofs, proof, box, target_object_pointer, deep_level);
        const signedReputation = (box.polarization ? 1 : -1) * boxReputation;
        return total + (proportion * signedReputation);
    }, 0);
}
function computeBoxReputation(all_proofs, parent_proof, box, target_object_pointer, deep_level) {
    if (parent_proof.type.typeName.includes("Proof-by-Token")) {
        const pointed_token_id = box.object_pointer;
        if (pointed_token_id === parent_proof.token_id)
            return 0.00;
        const pointed_proof = all_proofs.get(pointed_token_id);
        if (pointed_proof) {
            if (deep_level <= 0)
                return 0.00;
            return internal_compute(all_proofs, pointed_proof, target_object_pointer, deep_level - 1);
        }
        else {
            return 0.00;
        }
    }
    else {
        return box.object_pointer === target_object_pointer ? 1.00 : 0.00;
    }
}
