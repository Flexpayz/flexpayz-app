# Firebase development environment

Production: `bussiness-card-bda7f`. Development: `flexpayz-app-dev`.

## App commands

- `npm run dev` (or `npm start`): local app using development Firebase.
- `npm run build:dev`: optimized development Firebase build.
- `npm run build` / `npm run build:prod`: production Firebase build.
- `npm run deploy:dev`: builds dev and deploys Hosting, rules and Functions explicitly to dev.
- `npm run deploy:prod` / `npm run deploy`: builds and deploys explicitly to production.

Vite selects Firebase using its mode, independently of NODE_ENV. Config values are public web configuration, not Admin credentials. Unknown Vite modes fail. The CLI default remains production for compatibility; use the explicit npm deployment commands, not bare `firebase deploy` or `firebase use` as an app environment switch. Both build modes write `build/`, so do not build/deploy them concurrently. Functions remain in `europe-west1`.

## Provision the destination first

In the Firebase console for **flexpayz-app-dev**:

1. Enable Blaze billing and a budget alert. Enable Email/Password Auth; ensure the password policy accepts `test123`. Add localhost and the dev Hosting domain to authorized domains.
2. Create the `(default)` Firestore database and Storage bucket in Europe. This script expects `flexpayz-app-dev.firebasestorage.app`.
3. Keep Auth, Firestore and Storage empty before bootstrap. Do not manually register a test user yet.
4. Do not install a mail-sending extension, payment integration or outbound production integration. The script excludes the entire `mail` collection. Review any other deployed triggers before import.
5. Deploy existing rules with `npx firebase deploy --project flexpayz-app-dev --only firestore:rules,storage`. Review console-managed indexes, Auth settings/providers and other project configuration separately: document copying does not copy them.

Do not publish sensitive copied journal data behind a shared known password without an additional access boundary. The existing rules allow public reads of active product data. Running the frontend on localhost alone does not restrict cloud data access. Anonymize data or establish restricted dev access before copying real sensitive records.

## Credentials (never paste private keys into chat)

Store credentials locally under the gitignored `secrets/` directory:

- `secrets/firebase-prod-reader.json`: a service account belonging to production, with only read access needed for Firebase Auth users, Firestore and Storage objects (for example Firebase Authentication Viewer, Cloud Datastore Viewer and Storage Object Viewer, scoped as narrowly as possible).
- `secrets/firebase-dev-admin.json`: a service account belonging to dev with Firebase Auth administration, Firestore writes and Storage object administration.

Have an authorized project administrator create these service accounts/keys in Google Cloud IAM. Prefer a dedicated read-only source identity rather than the existing production Admin key. Never put these files in `src`, `public` or version control. Follow organization policy if service-account keys are prohibited; this bootstrap currently requires JSON service-account credentials.

## Read-only inventory

Run from the repository root:

```sh
PROJECT_ID=flexpayz-app-dev \
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-dev-admin.json \
SOURCE_GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-prod-reader.json \
node admin-scripts/copyToDev.cjs
```

This reads both projects, checks that the destination is empty and reports counts without printing personal records. It makes no writes. Reads and later copies incur normal Firebase usage. It checks URL conversions before applying, but cannot guarantee that a later write will succeed (permissions, quotas, password policy, etc.).

## Apply the initial copy

After reviewing the inventory and development access protections:

```sh
PROJECT_ID=flexpayz-app-dev \
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-dev-admin.json \
SOURCE_GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-prod-reader.json \
node admin-scripts/copyToDev.cjs --apply
```

The target is hardcoded and checked; credentials must match their respective projects. There is no production write path. Firestore reads use batches of up to 100 documents, with at most 10 concurrent subcollection checks or document creates. Auth and Storage copying remain sequential. This is suitable for a modest dataset, not a large production migration. It is not an atomic snapshot: arrange a quiet period if consistent relationships across changing records are required.

The script copies Storage objects first (retaining Firebase download-token metadata), then users, then Firestore documents. It preserves UIDs, document IDs, subcollections, timestamps, geopoints, bytes and custom claims. Document references are redirected to the target default database. Recognized production Storage and FlexPayz app URLs are rewritten recursively, including in arrays. External links remain external; signed Storage URLs cause a preflight failure because signatures cannot be reused for a new bucket. Custom media hosts, embedded URLs in prose/HTML and other buckets need separate review.

All email accounts get `test123`. Disabled accounts stay disabled; accounts without email cannot use email/password login. OAuth provider links, MFA enrollment, login/session history and Auth metadata are not cloned. The inventory reports MFA accounts; their dev copies intentionally use email/password without copied MFA. Production passwords and sessions are untouched. Product public-experience passwords remain unchanged: they are distinct from Auth account passwords.

The script excludes `mail`; it copies other discovered collections without schema normalization. It does not copy project IAM, secrets, extensions, indexes, Hosting configuration, Auth templates or non-default databases. Inspect source project services before claiming a full project clone.

A failed apply can leave a partial destination. The script deliberately refuses to overwrite any nonempty destination, including on rerun. Inspect the failure and agree a dev-only reset/recovery before retrying. It never deletes data. Repeat refresh/merge is not implemented.

## Verify

1. Run `npm run dev`; verify the admin environment detail displays `flexpayz-app-dev`.
2. Sign in using a copied active user's email and `test123`.
3. Verify product ownership, permissions and media, then edit one dev record and check both Firebase consoles to confirm only dev changed.
4. Test an admin account and a normal user. Verify uploads land in the dev bucket.
5. Review serial redirects and external links; intentional external destinations still lead outside dev.
6. Once access protection is appropriate, use `npm run deploy:dev` for hosted testing. Built dev links use the current dev origin.

Local verification: `npm run test:dev-copy`, relevant Jest tests, `npm run build`, `npm run build:dev`.

## Watching progress

The script prints its mode immediately, then the current service/stage. Every 10 seconds it prints completed items and seconds since the last progress. Increasing counts confirm completed work. Increasing time with unchanged counts means no item has completed; it can indicate a slow request, SDK retries, or a stalled connection, not proof of a dead process. Stage checks may legitimately show zero completed items until the next stage starts. Large file copies can take time before the completed-file count changes.

For the read-only command (without `--apply`), Ctrl+C is safe: no cloud writes are performed. Restart after updating the script to get new progress output. If a stage stays unchanged for several minutes, capture the last stage/error line for diagnosis. Avoid starting a second `--apply` process alongside another copy.

Batching preserves full document validation and discovery of subcollections under missing parents. Read results are matched by path, not response order. Incomplete batches and failed requests stop the run; in-flight operations are awaited before reporting failure. Successful concurrent writes may remain in dev after a failure, so the existing partial-copy recovery guidance still applies. Restart a running script to use these changes.

Transient Firestore read failures (including deadline/unavailable errors) now receive up to three additional attempts, with 1s, 2s and 4s backoff. Each retry is logged; each attempt can also include the SDK's own timeout/retries. Permanent errors and exhausted retries still stop the run. This retry wrapper is read-only and does not retry destination writes. A failure during inventory/preflight explicitly reports that this run made no cloud writes, even when `--apply` was requested. In that case, rerun the same command; no destination reset is needed for that run. Inventory restarts from the beginning.

## Separate services

Use `--only auth`, `--only firestore` or `--only storage` to inventory and optionally copy just one service. Without `--only`, all three remain selected. Each invocation checks only the selected destination for emptiness; previously copied services do not block a different service. Invalid or repeated flags are rejected before any cloud access. Inventory still validates the selected destination and source, and `--apply` performs that inventory before copying.

For example, copy Auth first:

```sh
PROJECT_ID=flexpayz-app-dev \
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-dev-admin.json \
SOURCE_GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-prod-reader.json \
node admin-scripts/copyToDev.cjs --only auth --apply
```

Repeat the same command with `--only firestore`, then `--only storage`. Omit `--apply` for read-only inventory of that service. Do not run an all-services copy after completing individual services: it will correctly reject the nonempty destinations. Failed partial copies of the selected service still require inspection before retrying; this flag does not enable overwrite/resume.

Firestore URLs still point to development Storage, so media will remain unavailable until its files are copied. Auth-only copying does not create user profile/ownership documents; those arrive with Firestore. Service selection bypasses an unavailable unselected service; it does not fix the cause of a Storage connection failure. No cloud copy is started merely by adding these flags to the script source.

## Resume an interrupted Auth-only copy

After resolving source duplicates, use `--only auth --resume-auth` for a read-only resume check; add `--apply` to continue. This mode rejects duplicate source emails/phones, destination-only UIDs and differing email/phone identities for the same UID. It creates only missing UIDs with the normal dev password and synchronizes custom claims for every source UID, including existing users, to repair interruptions after account creation. Existing users' passwords and profile fields are retained. It never deletes or merges accounts, and it cannot be used with Firestore or Storage selection.

```sh
PROJECT_ID=flexpayz-app-dev \
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-dev-admin.json \
SOURCE_GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-prod-reader.json \
node admin-scripts/copyToDev.cjs --only auth --resume-auth --apply
```

## Resume an interrupted Storage-only copy

Use `--only storage --resume-storage` to verify a partial copy without writing; add `--apply` to copy missing files. Existing objects must match production size, CRC32C checksum, content type/encoding/disposition/cache-control and custom metadata (including download tokens). Unexpected destination objects or mismatches stop the run; no objects are overwritten or deleted. Verification checks every existing object before copying starts. Counts in the copy stage include verified existing objects plus newly copied objects.

```sh
PROJECT_ID=flexpayz-app-dev \
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-dev-admin.json \
SOURCE_GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-prod-reader.json \
node admin-scripts/copyToDev.cjs --only storage --resume-storage --apply
```

New uploads use create-only generation preconditions and CRC32C validation, followed by a metadata/checksum comparison. Reads pin the inspected source object generation. If a connection resets after the server completes an upload, rerunning resume verifies that object and skips it if it matches. Network failures still stop the run; this mode resumes completed files, not bytes inside an unfinished upload. Avoid simultaneous copies of the same service. Keep the Mac awake and connected while transferring; a long log gap alone does not prove whether sleep or networking caused a reset.
