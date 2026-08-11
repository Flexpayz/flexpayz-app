# Firestore Schema Audit

This audit is based on repository code, tests, admin tools, and Firebase configuration inspected on 2026-08-11. No representative production export was inspected, so production data validity is not asserted.

## Collection Inventory

| Collection path | Document ID | Purpose | Fields discovered | Reads | Writes |
| --- | --- | --- | --- | --- | --- |
| `products/{productId}` | Firestore auto ID for generated products; legacy/external product IDs may exist | Device/product root document and shared public content document | `name`, `activated`, `inactive`, `preview`, `visibleSections`, `unlockCode`, `processed`, `category`, business card fields, upload labels, `youtubeLink`, password fields, colors, `logo`, `cv`, `businessFile`, `sharedContacts`, `previewLanguage`, possible `updatedAt` | admin, unlock-code lookup, manage device(s), public show page, business/custom-link/upload/video settings, serial export/uploader, control-state | admin product creation, activation, device settings, visibility, business/custom-link/upload/video/song settings, shared contacts, reset/save product data |
| `users/{uid}` | Firebase Auth UID | User profile and activated product list | `country`, `products` | manage-devices | registration, activation via `arrayUnion` |
| `permissions/{productId}` | Product ID | Feature entitlement flags | `business_card`, `custom_link`, `upload_files`, `upload_video`, `upload_songs`, `baby_journal`, `adult_journal`, `animal_tag` | admin, manage-device, `usePermission` | admin product creation and permission editor, serial uploader |
| `serial_numbers/{serialNumber}` | Physical serial number | Serial-to-product mapping and redirect metadata | `productID`, `type`, `redirectUrl`, `createdAt` | redirect, unlock-code lookup, serial CSV export, serial uploader duplicate check, serial migration | serial uploader, serial migration |
| `baby_journals/{productId}` | Product ID | Baby journal profile and records | scalar profile fields, `sleepSchedule`, parent objects, date-keyed investigation maps, asset arrays | baby settings, workspace, preview | admin empty doc creation, baby journal saves |
| `adult_journals/{productId}` | Product ID | Adult journal profile and medical records | scalar profile fields, `vitalSigns`, many date-keyed investigation maps, `consultations`, `followUp`, asset arrays, legacy `testMultiple` | adult settings, workspace, preview | admin empty doc creation, adult journal saves |
| `animal_tag/{productId}` | Product ID | Pet/animal tag profile | `photo`, `name`, `breed`, `age`, `weight`, `color`, `gender`, `height`, `ownerMessage`, `contact`, `isLost` | animal-tag settings/preview | admin empty doc creation, animal-tag save |
| `mail/{mailId}` | Firestore auto ID | Mail extension queue payload for animal location sharing | `to`, `message.subject`, `message.text` | none in app | animal-tag preview enqueue |

No subcollections, collection-group queries, or transactions were found. `writeBatch` is used for serial number upload and serial product migration. `serverTimestamp` is used only on `serial_numbers.createdAt`. `arrayUnion` is used for `users.products` and `products.sharedContacts`.

Cloud Firestore Security Rules are now managed in `firestore.rules`, linked from `firebase.json`, and verified by `src/firestore/rules/firestore-rules.test.ts` through `npm run test:firestore:rules`. Rules deploy separately with `npm run deploy:firestore:rules`.

Cloud Storage Security Rules are now managed in `storage.rules`, linked from `firebase.json`, and verified by `src/storage/rules/storage-rules.test.ts` through `npm run test:storage:rules`. Rules deploy separately with `npm run deploy:storage:rules`.

## Confirmed Mismatches

- Collection names are centralized in an enum inside `baby-journal-settings.tsx`, but many call sites still use raw strings such as `"products"`, `"permissions"`, and `"users"`.
- `products` documents are written as sparse objects in admin/serial creation, but the app often casts `snapshot.data()` to the full `Product` interface.
- `preview`/`visibleSections` values mix underscore and hyphen conventions: `upload_file`, `upload_video`, `animal_tag`, but `upload-songs`, `baby-journal`, and `adult-journal`.
- Several write paths spread UI state directly into Firestore, including legacy product and journal save helpers.
- `sharedContacts` stores numeric `date` while Firestore timestamps are used elsewhere for `serial_numbers.createdAt`.
- Journal records use arbitrary date strings as map keys, not Firestore timestamp fields.
- `serial_numbers.productID` uses uppercase `ID`, while most code uses `productId` in local variables.
- Existing components use unsafe `snapshot.data() as Type`, `useState<any[]>`, and `Record<string, any>` around Firestore boundaries.

## Suspected Mismatches Requiring Production Data

- Some product documents may contain old `preview` literals such as `upload_songs`, `baby_journal`, or `adult_journal`.
- `createdAt` may be a Firestore `Timestamp`, JavaScript `Date`, ISO string, Unix number, or absent on old serial documents.
- `users.products` may be missing, null, or contain non-string values in older accounts.
- Journal asset objects may use `source` instead of `url` in older upload components.
- `animal_tag.gender` may contain empty string or unsupported legacy values.
- Product `category` and `updatedAt` are read by dashboard types but not consistently written by current code.
- Public password protection is enforced in the browser after public product reads. Firestore rules cannot hide password-protected document fields while the current public page reads product data directly.
- Signed-in activation by unlock code remains a bounded client-side query. Rules require a query limit but cannot prove the user knew a valid unlock code without moving activation behind a backend boundary.
- Serial-number direct reads remain public for QR/redirect compatibility.

## Legacy Formats To Support

- Empty `{}` journal and animal-tag documents created by admin flows.
- Sparse `products` documents containing only activation, unlock code, name, preview, and processed fields.
- Missing optional product fields, nullable product fields, and empty string fields.
- Missing `permissions` documents, defaulting to all current permissions.
- Missing `serial_numbers.type`, defaulting to `default`.
- Date-keyed journal maps where keys are user-entered date strings.

## Proposed Canonical Schemas

- Raw Firestore schemas remain permissive and `.passthrough()` where unknown legacy fields may exist.
- Application models are normalized to complete objects before reaching React UI state.
- New writes use canonical field names already present in production-facing code.
- `products.preview` and `products.visibleSections` accept legacy literals at read time and normalize them to current `Preview` enum values.
- `serial_numbers.createdAt` accepts Firestore timestamps and other legacy date-like values at read time, but new writes use `serverTimestamp()`.

## Implementation Structure

- `src/firestore/collections.ts`: collection constants and typed path/reference helpers.
- `src/firestore/schema/primitives.ts`: reusable Zod primitives, validation logging, undefined stripping, and timestamp conversion.
- `src/firestore/schema/*.ts`: one runtime schema module per collection/domain.
- `src/firestore/repositories/*.ts`: read/write APIs for application code.
- Existing domain helpers remain responsible for display/business logic, but Firestore boundary parsing moves into schema modules.

## Risks And Migration Order

1. Add schemas and tests without changing call sites.
2. Migrate product and permissions reads first because they drive routing and access control.
3. Migrate serial/user/admin write flows next because they create linked documents.
4. Migrate journal and animal-tag flows with diff-based updates preserved.
5. Remove duplicate interfaces and final-search direct Firestore access.

The main regression risk is accidentally making sparse legacy documents invalid. The implementation must log validation context without logging complete document contents and must keep UI fallbacks equivalent to the current defaults.

## Security Rules Notes

- System admin access uses only the Firebase Auth custom claim `role == "system-admin"`. `admin-scripts/setAdminClaim.cjs` removes the old `admin` claim while preserving unrelated custom claims.
- Owner access is derived from `users/{uid}.products` containing the product ID.
- Public reads are intentionally allowed for activated products where `inactive != true` so `/show-product` continues to work without authentication.
- Public mail enqueue requires `productId` and validates that the target animal tag is active, lost, and has a matching contact email.
- Cloud Storage reads are aligned to the same public-active product state and owner/admin checks for `images`, `documents`, `audio`, `baby_journal`, `adult_journal`, `animal_tag`, and legacy `uploads` reads.
- Cloud Storage writes are limited to known current paths and bounded content types/sizes. Legacy `uploads` writes are denied while legacy reads remain compatible.
- Stronger privacy requires a backend boundary for public password-gated reads, public media reads, activation, serial redirects, and mail enqueue. Firestore and Storage rules cannot make browser-fetched password-gated content truly private.
