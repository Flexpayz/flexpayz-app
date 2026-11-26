import {getAuth, User} from "firebase/auth";
import {firebaseApp} from "./firebase";
import {DB_COLLECTIONS, documentPath} from "./firestore/collections";
import type {ProductUpdateInput} from "./firestore/schema/products";
import {getBusinessCardProductDiagnostics, getBusinessCardOwnershipDiagnostics} from "./firestore/repositories/businessCardDiagnostics";

function errorCode(error: unknown): string {
    return error && typeof error === "object" && "code" in error
        && typeof error.code === "string" && /^(?:storage\/|auth\/)?[a-z-]+$/.test(error.code)
        ? error.code : "unknown";
}

async function logPermissionDiagnostics(attemptId: string, user: User | null, productId: string | null, input?: ProductUpdateInput) {
    const auth = getAuth(firebaseApp);
    const context = {
        attemptId,
        authUidAtWrite: user?.uid ?? null,
        authUidNow: auth.currentUser?.uid ?? null,
        authChangedSinceWrite: user?.uid !== auth.currentUser?.uid,
        productPath: productId ? documentPath(DB_COLLECTIONS.PRODUCTS, productId) : null,
        userPath: user ? documentPath(DB_COLLECTIONS.USERS, user.uid) : null,
        projectId: firebaseApp.options.projectId,
        interpretation: "Client diagnostic of local rules, not a server rule trace. Deployed rules may differ. Product metadata is diagnostic only; rule evaluation remains server-side.",
    };
    console.info("[BusinessCardSave] permission-checks started", context);
    if (!user || !productId) return;

    // Independent checks: a denied profile read must not hide the token diagnosis.
    await Promise.all([
        (async () => {
            if (!input) return;
            try {
                const checks = await getBusinessCardProductDiagnostics(productId, input);
                console.info("[BusinessCardSave] product-shape-checks", {...context, ...checks});
            } catch (error) {
                console.warn("[BusinessCardSave] product-shape-checks unavailable", {...context, code: errorCode(error)});
            }
        })(),
        (async () => {
            try {
                const token = await user.getIdTokenResult();
                console.info("[BusinessCardSave] auth-checks", {
                    ...context,
                    tokenSubjectMatchesUser: token.claims.sub === user.uid,
                    tokenProjectMatchesApp: token.claims.aud === firebaseApp.options.projectId,
                    tokenIssuerMatchesApp: token.claims.iss === `https://securetoken.google.com/${firebaseApp.options.projectId}`,
                    isSystemAdmin: token.claims.role === "system-admin",
                    tokenExpirationTime: token.expirationTime,
                    note: "Current SDK token metadata; no forced refresh. The failed request token is not exposed by Firestore.",
                });
            } catch (error) {
                console.warn("[BusinessCardSave] auth-checks unavailable", {...context, code: errorCode(error)});
            }
        })(),
        (async () => {
            try {
                const checks = await getBusinessCardOwnershipDiagnostics(user.uid, productId);
                console.info("[BusinessCardSave] ownership-checks", {
                    ...context, ...checks,
                    ownsProductAccordingToLocalRule: checks.userDocumentExists && checks.productsIsList && checks.productListedForUser,
                    note: "Fresh server read after failure. Ownership uses users/{uid}.products, not product.ownerId.",
                });
            } catch (error) {
                console.warn("[BusinessCardSave] ownership-checks unavailable", {
                    ...context, code: errorCode(error),
                    note: "Read failed: ownership is unknown, not false.",
                });
            }
        })(),
    ]);
}

type SaveStage = "firestore-update" | "logo-lookup" | "vcard-build" | "vcard-upload";

let attemptSequence = 0;

/** Logs identifiers for account diagnosis, but never card values, emails, tokens or raw errors. */
export function createBusinessCardSaveTrace(mode: "manual" | "autosave", productId: string | null, input?: ProductUpdateInput) {
    const attemptId = `business-card-${Date.now()}-${++attemptSequence}`;
    let fieldsPersisted = false;

    return {
        async run<T>(stage: SaveStage, operation: () => T | Promise<T>): Promise<T> {
            const started = Date.now();
            const userAtWrite = getAuth(firebaseApp).currentUser;
            const context = {
                attemptId,
                mode,
                stage,
                hasProductId: Boolean(productId),
                projectId: firebaseApp.options.projectId,
                storageBucket: firebaseApp.options.storageBucket,
                signedIn: Boolean(userAtWrite),
                authUid: userAtWrite?.uid ?? null,
                online: typeof navigator === "undefined" ? undefined : navigator.onLine,
            };
            console.info("[BusinessCardSave] started", context);
            try {
                const result = await operation();
                if (stage === "firestore-update") fieldsPersisted = true;
                console.info("[BusinessCardSave] succeeded", {
                    ...context, fieldsPersisted, elapsedMs: Date.now() - started,
                });
                return result;
            } catch (error) {
                const code = errorCode(error);
                console.error("[BusinessCardSave] failed", {
                    ...context, code, fieldsPersisted, elapsedMs: Date.now() - started,
                });
                if (stage === "firestore-update" && code === "permission-denied") {
                    // Do not delay the failed-save UI or replace the original exception.
                    void logPermissionDiagnostics(attemptId, userAtWrite, productId, input).catch(() => {
                        console.warn("[BusinessCardSave] permission-checks unavailable", {attemptId});
                    });
                }
                throw error;
            }
        },
    };
}
