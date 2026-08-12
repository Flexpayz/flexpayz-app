import {
    buildAdultJournalUpdate,
    countInvestigationAssets,
    countInvestigationRecords,
    emptyAdultJournalInformation,
    formatAdultDate,
    getAdultJournalCompletion,
    getLatestVitalSigns,
    maskPersonalId,
    normalizeAdultJournal,
    sortAdultDateKeysNewestFirst,
} from "./adult-journal";

describe("Adult Journal compatibility helpers", () => {
    it("normalizes partial legacy journals without nullish UI values", () => {
        const journal = normalizeAdultJournal({
            name: "Alex",
            profilePicture: [{url: "https://example.com/profile.png"}],
            vitalSigns: null,
            laboratoryTests: {
                "2026-07-12": {description: "Blood panel", assets: [{url: "https://example.com/result.pdf"}]},
            },
            testMultiple: {
                legacy: {description: "Legacy record"},
            },
        });

        expect(journal.name).toBe("Alex");
        expect(journal.profilePicture[0].name).toBe("Uploaded file 1");
        expect(journal.vitalSigns).toEqual({});
        expect(journal.laboratoryTests["2026-07-12"].assets[0].name).toBe("Uploaded file 1");
        expect(journal.testMultiple.legacy.description).toBe("Legacy record");
    });

    it("builds safe dot-path updates and avoids full document reconstruction", () => {
        const original = normalizeAdultJournal({
            name: "Alex",
            vitalSigns: {
                "2026-07-12": {bloodPressure: "118 / 76", pulse: "68 bpm", temperature: "36.6 °C", respiratoryRate: "16 / min"},
            },
        });
        const current = normalizeAdultJournal({
            name: "Alex Morgan",
            vitalSigns: {
                "2026-07-12": {bloodPressure: "120 / 78", pulse: "68 bpm", temperature: "36.6 °C", respiratoryRate: "16 / min"},
            },
        });

        expect(buildAdultJournalUpdate(current, original)).toEqual({
            name: "Alex Morgan",
            "vitalSigns.2026-07-12.bloodPressure": "120 / 78",
        });
    });

    it("sorts dates safely and derives latest vital signs", () => {
        const vitalSigns = {
            "2026-07-10": {bloodPressure: "110 / 70", pulse: "66", temperature: "36.5", respiratoryRate: "14"},
            "2026-07-12": {bloodPressure: "118 / 76", pulse: "68", temperature: "36.6", respiratoryRate: "16"},
            legacy: {bloodPressure: "100 / 60", pulse: "60", temperature: "36", respiratoryRate: "12"},
        };

        expect(sortAdultDateKeysNewestFirst(Object.keys(vitalSigns))[0]).toBe("2026-07-12");
        expect(getLatestVitalSigns(vitalSigns)?.value.bloodPressure).toBe("118 / 76");
        expect(formatAdultDate("bad-date")).toBe("Not dated");
    });

    it("masks identifiers without exposing the full value", () => {
        expect(maskPersonalId("1234567894821")).toBe("•••••••••4821");
        expect(maskPersonalId("42")).toBe("••••2");
        expect(maskPersonalId("")).toBe("Not recorded");
    });

    it("counts records/assets and derives non-persistent completion", () => {
        const journal = normalizeAdultJournal({
            ...emptyAdultJournalInformation,
            name: "Alex",
            birthDate: "1988-09-12",
            gender: "Male",
            bloodType: "O+",
            laboratoryTests: {"2026-07-12": {description: "Blood panel", assets: [{name: "result.pdf", url: "https://example.com/result.pdf"}]}},
        });

        expect(countInvestigationRecords(journal.laboratoryTests)).toBe(1);
        expect(countInvestigationAssets(journal.laboratoryTests)).toBe(1);
        expect(getAdultJournalCompletion(journal)).toBeGreaterThan(0);
    });
});
