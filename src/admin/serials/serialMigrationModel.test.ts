import {parseSerialMigrationText, extractProductId, getTemplate} from "./serialMigrationModel";

describe("serial migration parsing", () => {
    it("parses header-based CSV", () => {
        const parsed = parseSerialMigrationText("oldProductId,newProductId\nold-1,new-1\n");

        expect(parsed.errors).toEqual([]);
        expect(parsed.rows).toEqual([
            {rowNumber: 2, sourceProductId: "old-1", targetId: "new-1", original: "{\"oldProductId\":\"old-1\",\"newProductId\":\"new-1\"}"},
        ]);
    });

    it("parses legacy URL format", () => {
        const parsed = parseSerialMigrationText("https://flexpayz.com/app?product_id=old-2,new-2\n");

        expect(parsed.errors).toEqual([]);
        expect(parsed.rows[0]).toMatchObject({rowNumber: 1, sourceProductId: "old-2", targetId: "new-2"});
    });

    it("handles quoted CSV fields and BOM", () => {
        const parsed = parseSerialMigrationText("\uFEFFoldProductId,newProductId\n\"https://flexpayz.com/app?product_id=old-3\",\"sanitas,external\"\n");

        expect(parsed.errors).toEqual([]);
        expect(parsed.rows[0]).toMatchObject({sourceProductId: "old-3", targetId: "sanitas,external"});
    });

    it("reports missing IDs", () => {
        const parsed = parseSerialMigrationText("oldProductId,newProductId\n,missing-source-target\nold-4,\n");

        expect(parsed.errors).toEqual([
            "Row 2: missing source product ID.",
            "Row 3: missing target ID.",
        ]);
    });

    it("reports duplicate source and target IDs", () => {
        const parsed = parseSerialMigrationText("oldProductId,newProductId\nold-5,target-1\nold-5,target-2\nold-6,target-2\n");

        expect(parsed.errors).toEqual([
            "Row 2: duplicate source product ID.",
            "Row 3: duplicate source product ID.",
            "Row 3: duplicate target ID.",
            "Row 4: duplicate target ID.",
        ]);
    });

    it("reports invalid product URLs without product_id", () => {
        const parsed = parseSerialMigrationText("oldProductId,newProductId\nhttps://flexpayz.com/app?id=old-7,target-7\n");

        expect(parsed.errors).toEqual([
            "Row 2: source URL must include a product_id parameter.",
        ]);
    });

    it("skips empty rows", () => {
        const parsed = parseSerialMigrationText("oldProductId,newProductId\n\nold-8,target-8\n\n");

        expect(parsed.errors).toEqual([]);
        expect(parsed.rows).toHaveLength(1);
        expect(parsed.rows[0]).toMatchObject({rowNumber: 2, sourceProductId: "old-8", targetId: "target-8"});
    });

    it("extracts product IDs safely and provides templates", () => {
        expect(extractProductId("https://flexpayz.com/app?product_id=abc123")).toBe("abc123");
        expect(extractProductId("plain-id")).toBe("plain-id");
        expect(getTemplate("generic")).toContain("TARGET_FLEXPAYZ_PRODUCT_ID");
        expect(getTemplate("sanitas")).toContain("EXTERNAL_SANITAS_PRODUCT_ID");
    });
});
