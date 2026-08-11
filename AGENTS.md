# FlexPayz Codex Working Notes

- All newly redesigned UI must use the centralized FlexPayz theme and tokens.
- Do not introduce raw colors, arbitrary spacing or page-local typography in new UI.
- Reuse existing design-system primitives before creating new ones.
- New UI must be mobile-first and tested at approximately 390px, 768px, 1280px and 1440px widths.
- All visible interface copy is written in English.
- Champagne is the only supported visual theme for now.
- Preserve Firebase contracts, database communication and authentication behavior unless a task explicitly requests data changes.
- Keep settings/editor UI separate from public/show UI.
- When modifying public pages or public/show UI, check whether `src/public-i18n.tsx` needs new or updated translations for English, Swedish and French.
- Preserve the routing rule: zero selected sections shows the empty state; one selected section opens directly; two or more selected sections show the content dashboard.
- One global password protects the complete public experience.
- Do not add content reordering.
- Maintain accessible contrast, keyboard navigation, focus-visible states and 44px touch targets.
- Avoid large page rewrites. Migrate one flow at a time.
- Do not silently modify unrelated legacy styles.
- Run the build and relevant tests after every implementation task.

## Firestore architecture

- Preserve the Firestore database contract unless a task explicitly requests a data migration or contract change.
- Keep collection names and document path construction centralized in `src/firestore/collections.ts`.
- Do not add raw Firestore SDK access in feature, page, component or utility modules. Production reads and writes must go through `src/firestore/repositories/*`.
- Keep `getDoc`, `getDocs`, `setDoc`, `updateDoc`, `addDoc`, `writeBatch`, `arrayUnion`, `serverTimestamp`, `snapshot.data()` and direct collection references inside repository modules or repository tests.
- Add or update Zod schemas in `src/firestore/schema/*` before introducing new Firestore fields or changing read/write payloads.
- Keep separate raw Firestore, normalized app model, create input, replacement input, update input and `{id, data}` result types where a collection has reads or writes.
- Legacy reads should remain loose and normalize sparse, optional or nullable Firestore data into current UI models. Canonical writes must keep existing collection names and field names.
- Keep Cloud Firestore Security Rules in `firestore.rules` aligned with repository behavior and collection schemas.
- When rules change, add or update emulator tests in `src/firestore/rules/*` and run `npm run test:firestore:rules` when Java/Firebase Emulator are available.
- When modifying Firestore-backed behavior, check `docs/firestore-schema-audit.md` and update it if collections, fields, ID semantics, readers, writers, legacy formats, risks or migration order change.
- Product, permission, user activation, serial upload/migration/export, journal save, animal-tag save and mail enqueue flows must use typed repositories.
- After Firestore-related work, run relevant schema/repository tests plus the build, and search for new raw Firestore access outside `src/firestore/repositories`.

## Non-image file uploads

- All new or redesigned non-image file-upload flows must use the shared `FileUploadField` component and its approved `useResumableFileUpload` adapter.
- Do not create page-local raw `<input type="file">` implementations for documents, PDFs, audio, video, archives or other non-image files.
- Configure accepted formats, MIME types, extensions and size limits through the shared component’s typed API.
- Reuse its validation, progress, cancellation, retry, replace, removal, accessibility and error states.
- Keep Firebase Storage paths and persistence logic in a feature adapter or hook, not inside the generic visual component.
- This rule does not apply to photos or images.
- Profile photos, logos, gallery images and other visual-media workflows must use the dedicated image uploader/cropper components.
- Do not migrate image uploaders to `FileUploadField`.
- Client-side validation is UX protection, not a security boundary; preserve or strengthen server-side Storage validation when explicitly in scope.
