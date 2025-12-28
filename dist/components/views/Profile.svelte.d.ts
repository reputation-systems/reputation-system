import { SvelteComponent } from "svelte";
import type { ReputationProof } from "../../ReputationProof";
declare const __propDef: {
    props: {
        reputationProof: ReputationProof | null;
        userProfiles?: ReputationProof[] | undefined;
        connected: boolean;
        title?: string | undefined;
        showDidacticInfo?: boolean | undefined;
        visibleTokenTypes?: string[] | null | undefined;
        showProfileSwitcher?: boolean | undefined;
        showSacrificedAssets?: boolean | undefined;
        showTechnicalDetails?: boolean | undefined;
        showFilters?: boolean | undefined;
        showBoxesSection?: boolean | undefined;
        showReceivedOpinions?: boolean | undefined;
        allowCreateProfile?: boolean | undefined;
        allowSacrifice?: boolean | undefined;
        allowEditBox?: boolean | undefined;
        allowDeleteBox?: boolean | undefined;
        allowSetMainBox?: boolean | undefined;
        subtitle?: string | null | undefined;
        compact?: boolean | undefined;
        maxBoxesVisible?: number | null | undefined;
        readOnly?: boolean | undefined;
        autoRefresh?: boolean | undefined;
        refreshInterval?: number | undefined;
    };
    events: {
        refresh: CustomEvent<any>;
        switchProfile: CustomEvent<any>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ProfileProps = typeof __propDef.props;
export type ProfileEvents = typeof __propDef.events;
export type ProfileSlots = typeof __propDef.slots;
export default class Profile extends SvelteComponent<ProfileProps, ProfileEvents, ProfileSlots> {
}
export {};
