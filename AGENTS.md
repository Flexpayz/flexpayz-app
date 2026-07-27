# FlexPayz Codex Working Notes

- All newly redesigned UI must use the centralized FlexPayz theme and tokens.
- Do not introduce raw colors, arbitrary spacing or page-local typography in new UI.
- Reuse existing design-system primitives before creating new ones.
- New UI must be mobile-first and tested at approximately 390px, 768px, 1280px and 1440px widths.
- All visible interface copy is written in English.
- Champagne is the only supported visual theme for now.
- Preserve Firebase contracts, database communication and authentication behavior unless a task explicitly requests data changes.
- Keep settings/editor UI separate from public/show UI.
- Preserve the routing rule: zero selected sections shows the empty state; one selected section opens directly; two or more selected sections show the content dashboard.
- One global password protects the complete public experience.
- Do not add content reordering.
- Maintain accessible contrast, keyboard navigation, focus-visible states and 44px touch targets.
- Avoid large page rewrites. Migrate one flow at a time.
- Do not silently modify unrelated legacy styles.
- Run the build and relevant tests after every implementation task.
