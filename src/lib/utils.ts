import { ErgoAddress, SSigmaProp, SGroupElement, SConstant } from "@fleet-sdk/core";
import { SBool, SByte, SColl, SPair, SLong } from "@fleet-sdk/serializer";
import { stringToBytes } from "@scure/base";
import { connected } from "./store";
import { get } from "svelte/store";

/**
 * Converts a hex string from a serialized value to a UTF-8 string.
 * @param hexString The hexadecimal string to convert.
 * @returns A UTF-8 string or null on error.
 */
export function hexToUtf8(hexString: string): string | null {
    if (!hexString || hexString.length % 2 !== 0) {
        return ""; // Return empty string for invalid input
    }
    try {
        const byteArray = new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(byteArray);
    } catch (e) {
        console.error("hexToUtf8 conversion error with ", hexString, e);
        return null;
    }
}

export function hexToBytes(hexString: string | undefined | null): Uint8Array | null {
    if (!hexString || typeof hexString !== 'string' || !/^[0-9a-fA-F]*$/.test(hexString)) {
        return null;
    }
    if (hexString.length % 2 !== 0) {
        return null;
    }
    try {
        const byteArray = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < byteArray.length; i++) {
            const byte = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
            if (isNaN(byte)) {
                throw new Error("Se encontró un carácter hexadecimal inválido durante el parseInt.");
            }
            byteArray[i] = byte;
        }
        return byteArray;
    } catch (e) {
        console.error("hexToBytes: Error convirtiendo hex a bytes:", hexString, e);
        return null;
    }
}

export function hexOrUtf8ToBytes(value: string | null | undefined): Uint8Array {
    if (!value) {
        return new Uint8Array();
    }

    const hexBytes = hexToBytes(value);
    if (hexBytes) {
        return hexBytes;
    }

    // fallback: utf-8
    return new TextEncoder().encode(value);
}

/**
 * Generates a PK proposition (R7 register format) from a wallet address.
 * @param wallet_pk The base58 encoded wallet address.
 * @returns The hex representation of the Sigma proposition.
 */
export function generate_pk_proposition(wallet_pk: string): string {
    const pk = ErgoAddress.fromBase58(wallet_pk).getPublicKeys()[0];
    const groupElement = SGroupElement(pk);
    const sigmaProp = SSigmaProp(groupElement);
    return sigmaProp.toHex();
}

/**
 * Serializes a JavaScript string into an Ergo-compatible Coll[Byte] hex string.
 * @param value The string to serialize.
 * @returns The serialized hex string.
 */
export function SString(value: string): string {
    return SConstant(SColl(SByte, stringToBytes('utf8', value)));
}

/**
 * Serializes a JavaScript boolean into an Ergo-compatible Boolean hex string.
 * @param value The boolean to serialize.
 * @returns The serialized hex string.
 */
export function booleanToSerializer(value: boolean): string {
    return SConstant(SBool(value));
}

/**
 * Serializes a (boolean, number) tuple into an Ergo-compatible (Boolean, Long) hex string for R6.
 * @param isLocked The lock state.
 * @param totalSupply The total token supply.
 * @returns The serialized hex string for the tuple.
 */
export function tupleToSerialized(isLocked: boolean, totalSupply: number): string {
    const tuple = SPair(SBool(isLocked), SLong(totalSupply));
    return SConstant(tuple);
}

/**
 * Checks if a given R7 register value corresponds to the currently connected wallet address.
 * @param r7Value The serialized value from the R7 register.
 * @returns A promise that resolves to true if the address matches, otherwise false.
 */
export async function check_if_r7_is_local_addr(r7Value: string): Promise<boolean> {
    if (!get(connected)) return false;
    // The first 4 bytes of a sigma prop are metadata, so they are sometimes omitted.
    const change_address = await ergo.get_change_address();
    if (!change_address) {
        throw new Error("Could not get the creator's address from the wallet.");
    }
    const creatorP2PKAddress = ErgoAddress.fromBase58(change_address);
    const creatorPkBytes = creatorP2PKAddress.getPublicKeys()[0];
    if (!creatorPkBytes) {
        throw new Error(`Could not extract the public key from the address ${change_address}.`);
    }
    let localPkProp = SColl(SByte, creatorPkBytes).toHex();
    return localPkProp.endsWith(r7Value);
}

/**
 * A utility function to convert a serialized value to its "rendered" format (for debugging/display).
 * This is a simplification and may not cover all Ergo types.
 * @param serializedValue The full serialized hex string.
 * @returns A simplified hex string.
 */
export function serializedToRendered(serializedValue: string): string {
    if (serializedValue.startsWith('0e')) {
        return serializedValue.substring(4);
    } else if (serializedValue.startsWith('04')) {
        return serializedValue.substring(2);
    }
    return serializedValue;
}

/**
 * Converts a JavaScript string directly to its "rendered" hex format.
 * This is a convenience function that combines stringToSerialized and serializedToRendered.
 * @param value The string to convert.
 * @returns The simplified, rendered hex string.
 */
export function stringToRendered(value: string): string {
    return serializedToRendered(SString(value));
}

/**
 * Converts a rendered hex string back to a UTF-8 string.
 * For simple text, the "rendered" value is just its hex representation.
 * @param renderedValue The rendered hex string.
 * @returns A UTF-8 string or null on error.
 */
export function renderedToString(renderedValue: string): string | null {
    return hexToUtf8(renderedValue);
}

export function uint8ArrayToHex(array: Uint8Array): string {
    return [...new Uint8Array(array)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

export function parseCollByteToHex(renderedValue: any): string | null {
    if (renderedValue === null || renderedValue === undefined) return null;

    if (Array.isArray(renderedValue) && renderedValue.every(item => typeof item === 'number' && item >= 0 && item <= 255)) {
        try {
            return uint8ArrayToHex(new Uint8Array(renderedValue));
        } catch (e) {
            console.error("parseCollByteToHex: Error convirtiendo array de bytes a hex:", renderedValue, e);
            return null;
        }
    }
    if (typeof renderedValue === 'string') {
        const cleanedHex = renderedValue.startsWith('0x') ? renderedValue.substring(2) : renderedValue;
        if (/^[0-9a-fA-F]*$/.test(cleanedHex) && cleanedHex.length % 2 === 0) {
            return cleanedHex;
        }
    }
    return null;
}

import type { ReputationProof } from "./ReputationProof";

export function calculate_reputation(proof: ReputationProof): number {
    const burned_value = proof.current_boxes.reduce((acc, b) => acc + Number(b.box.value), 0);
    const subjective = 1;
    return burned_value * subjective;
}

export function total_burned_string(proof: ReputationProof): string {
    const totalValue = proof.current_boxes.reduce((accumulator, box) => {
        return accumulator + BigInt(box.box.value);
    }, 0n);

    const scale = 10n ** 9n;
    const integerPart = totalValue / scale;
    const fractionalPart = totalValue % scale;

    let paddedFraction = fractionalPart.toString().padStart(9, '0');
    paddedFraction = paddedFraction.replace(/0+$/, '');

    if (paddedFraction === '') {
        paddedFraction = '0';
    }

    return `${integerPart}.${paddedFraction}`;
}

export function total_burned(proof: ReputationProof): number {
    const totalValue = proof.current_boxes.reduce((accumulator, box) => {
        return accumulator + BigInt(box.box.value);
    }, 0n);

    return Number(totalValue);
}