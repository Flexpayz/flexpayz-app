import {getFunctions, httpsCallable} from "firebase/functions";
import {firebaseApp} from "../../firebase";
import {
    SerialMigrationDryRunResponse,
    SerialMigrationExecuteResponse,
    SerialMigrationInputRow,
    SerialMigrationMode,
} from "../../admin/serials/serialMigrationModel";
import {FIREBASE_FUNCTIONS_REGION} from "./adminProductCreation";

export interface SerialMigrationDryRunRequest {
    operationId: string;
    mode: SerialMigrationMode;
    rows: SerialMigrationInputRow[];
}

export interface SerialMigrationExecuteRequest extends SerialMigrationDryRunRequest {
    validationToken: string;
    reason: string;
    confirmationPhrase: string;
    acknowledgedPermanentDeletion: boolean;
    inputChecksum?: string;
}

export async function dryRunSerialMigration(input: SerialMigrationDryRunRequest): Promise<SerialMigrationDryRunResponse> {
    const functions = getFunctions(firebaseApp, FIREBASE_FUNCTIONS_REGION);
    const callable = httpsCallable<SerialMigrationDryRunRequest, SerialMigrationDryRunResponse>(functions, "dryRunSerialMigration");
    const response = await callable(input);
    return response.data;
}

export async function executeSerialMigration(input: SerialMigrationExecuteRequest): Promise<SerialMigrationExecuteResponse> {
    const functions = getFunctions(firebaseApp, FIREBASE_FUNCTIONS_REGION);
    const callable = httpsCallable<SerialMigrationExecuteRequest, SerialMigrationExecuteResponse>(functions, "executeSerialMigration");
    const response = await callable(input);
    return response.data;
}

