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
