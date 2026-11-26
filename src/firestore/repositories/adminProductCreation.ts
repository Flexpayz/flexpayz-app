import {getFunctions, httpsCallable} from "firebase/functions";
import {firebaseApp} from "../../firebase";
import {
    ADMIN_CREATE_PRODUCTS_FUNCTION,
    ProductCreationRequest,
    ProductCreationResponse,
} from "../../admin/products/productCreationModel";

export const FIREBASE_FUNCTIONS_REGION = "europe-west1";

export class AdminProductCreationBackendUnavailableError extends Error {
    constructor(message = "Trusted product creation backend is not deployed.") {
        super(message);
        this.name = "AdminProductCreationBackendUnavailableError";
    }
}

export async function requestAdminProductCreation(request: ProductCreationRequest): Promise<ProductCreationResponse> {
    try {
        const functions = getFunctions(firebaseApp, FIREBASE_FUNCTIONS_REGION);
        const callable = httpsCallable<ProductCreationRequest, ProductCreationResponse>(functions, ADMIN_CREATE_PRODUCTS_FUNCTION);
        const response = await callable(request);
        return response.data;
    } catch (error) {
        if (isMissingBackendError(error)) {
            throw new AdminProductCreationBackendUnavailableError();
        }
        throw error;
    }
}

function isMissingBackendError(error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as {code?: unknown}).code) : "";
    return code === "functions/not-found" || code === "not-found" || code === "functions/unimplemented" || code === "unimplemented";
}
