/**
 * Converts a hex string from a serialized value to a UTF-8 string.
 * @param hexString The hexadecimal string to convert.
 * @returns A UTF-8 string or null on error.
 */
export declare function hexToUtf8(hexString: string): string | null;
export declare function hexToBytes(hexString: string | undefined | null): Uint8Array | null;
/**
 * Generates a PK proposition (R7 register format) from a wallet address.
 * @param wallet_pk The base58 encoded wallet address.
 * @returns The hex representation of the Sigma proposition.
 */
export declare function generate_pk_proposition(wallet_pk: string): string;
/**
 * Serializes a JavaScript string into an Ergo-compatible Coll[Byte] hex string.
 * @param value The string to serialize.
 * @returns The serialized hex string.
 */
export declare function SString(value: string): string;
/**
 * Serializes a JavaScript boolean into an Ergo-compatible Boolean hex string.
 * @param value The boolean to serialize.
 * @returns The serialized hex string.
 */
export declare function booleanToSerializer(value: boolean): string;
/**
 * Serializes a (boolean, number) tuple into an Ergo-compatible (Boolean, Long) hex string for R6.
 * @param isLocked The lock state.
 * @param totalSupply The total token supply.
 * @returns The serialized hex string for the tuple.
 */
export declare function tupleToSerialized(isLocked: boolean, totalSupply: number): string;
/**
 * Checks if a given R7 register value corresponds to the currently connected wallet address.
 * @param r7Value The serialized value from the R7 register.
 * @returns A promise that resolves to true if the address matches, otherwise false.
 */
export declare function check_if_r7_is_local_addr(r7Value: string): Promise<boolean>;
/**
 * A utility function to convert a serialized value to its "rendered" format (for debugging/display).
 * This is a simplification and may not cover all Ergo types.
 * @param serializedValue The full serialized hex string.
 * @returns A simplified hex string.
 */
export declare function serializedToRendered(serializedValue: string): string;
/**
 * Converts a JavaScript string directly to its "rendered" hex format.
 * This is a convenience function that combines stringToSerialized and serializedToRendered.
 * @param value The string to convert.
 * @returns The simplified, rendered hex string.
 */
export declare function stringToRendered(value: string): string;
/**
 * Converts a rendered hex string back to a UTF-8 string.
 * For simple text, the "rendered" value is just its hex representation.
 * @param renderedValue The rendered hex string.
 * @returns A UTF-8 string or null on error.
 */
export declare function renderedToString(renderedValue: string): string | null;
