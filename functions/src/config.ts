import {setGlobalOptions} from "firebase-functions/v2";

export const FUNCTIONS_REGION = "europe-west1";
export const MAX_PRODUCT_CREATION_QUANTITY = 500;
export const UNLOCK_CODE_RETRY_LIMIT = 20;
export const IDEMPOTENCY_TTL_DAYS = 14;

setGlobalOptions({
  region: FUNCTIONS_REGION,
});

