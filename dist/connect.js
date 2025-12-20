import { address, connected, network } from "./store";
/**
 * Connects to the Nautilus wallet using the globally available ergoConnector object.
 * Updates the application's stores with the connection status, wallet address, and network.
 */
export async function connectNautilus() {
    // Check if the Ergo dApp connector is injected into the window
    if (typeof ergoConnector !== 'undefined') {
        const nautilus = ergoConnector.nautilus;
        if (nautilus) {
            // Request connection to the wallet
            if (await nautilus.connect()) {
                console.log('Connected!');
                // Once connected, set the global stores
                address.set(await ergo.get_change_address());
                network.set("ergo");
                connected.set(true);
            }
            else {
                alert('Not connected!');
            }
        }
        else {
            alert('Nautilus Wallet is not active');
        }
    }
    else {
        alert('No wallet available');
    }
}
