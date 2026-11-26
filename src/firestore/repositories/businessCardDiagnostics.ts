import {getDocFromServer} from "firebase/firestore";
import {ProductUpdateInput, serializeProductUpdate} from "../schema/products";
import {db} from "../../firebase";
import {DB_COLLECTIONS, documentRef} from "../collections";

/** Inspect the raw ownership fields used by rules, without normalizing legacy data. */
export async function getBusinessCardOwnershipDiagnostics(uid: string, productId: string) {
    const snapshot = await getDocFromServer(documentRef<Record<string, unknown>>(db, DB_COLLECTIONS.USERS, uid));
    const products: unknown = snapshot.exists() ? snapshot.data()?.products : undefined;
    return {
        userDocumentExists: snapshot.exists(),
        productsIsList: Array.isArray(products),
        productListedForUser: Array.isArray(products) && products.includes(productId),
    };
}


/** Summarize raw data: normalization would hide precisely the legacy types we need to diagnose. */
export function describeProductFields(data: Record<string, unknown>) {
    return Object.entries(data).map(([field, value]) => ({
        field,
        type: value === null ? "null" : Array.isArray(value) ? "array" : typeof value,
        ...(typeof value === "string" ? {length: Array.from(value).length} : {}),
        ...(Array.isArray(value) ? {length: value.length} : {}),
    }));
}

export async function getBusinessCardProductDiagnostics(productId: string, input: ProductUpdateInput) {
    const snapshot = await getDocFromServer(documentRef<Record<string, unknown>>(db, DB_COLLECTIONS.PRODUCTS, productId));
    const existing = snapshot.exists() ? snapshot.data() : {};
    const update = serializeProductUpdate(input);
    return {
        productDocumentExists: snapshot.exists(),
        submittedFields: describeProductFields(update),
        resultingDocumentFields: describeProductFields({...existing, ...update}),
        // String/boolean business-card payloads allow exact comparisons without logging values.
        changedFields: Object.keys(update).filter(field => existing[field] !== update[field]),
        note: "Field metadata only. Result uses a server read after the failed write, so concurrent changes may affect it. Compare with isProductShape and ownerEditableProductKeys in deployed rules.",
    };
}
