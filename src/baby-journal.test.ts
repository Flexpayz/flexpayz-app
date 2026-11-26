import {
    buildBabyJournalUpdate,
    deriveBabyAgeLabel,
    emptyBabyJournalInformation,
    formatJournalDate,
    getBabyJournalCompletion,
    getDatedMilestones,
    getLatestSleepEntry,
    normalizeBabyJournal,
    sortJournalDateKeysNewestFirst,
} from "./baby-journal";

describe("Baby Journal compatibility helpers", () => {
    it("normalizes missing and null legacy structures without exposing nullish values", () => {
        const journal = normalizeBabyJournal({
            name: "Luna",
            mother: null,
            father: {name: "Alex", profilePicture: null},
            sleepSchedule: null,
            vaccines: {
                "2026-07-12": {description: "4 dated records"},
            },
            profilePicture: [{url: "https://example.com/photo.png"}],
        });

        expect(journal.name).toBe("Luna");
        expect(journal.mother.name).toBe("");
        expect(journal.father.name).toBe("Alex");
        expect(journal.father.profilePicture).toEqual([]);
        expect(journal.sleepSchedule).toEqual({});
        expect(journal.vaccines["2026-07-12"]).toEqual({description: "4 dated records", assets: []});
        expect(journal.profilePicture[0]).toEqual({url: "https://example.com/photo.png", name: "Uploaded file 1"});
    });

    it("builds a targeted update instead of reconstructing the journal", () => {
        const original = normalizeBabyJournal({name: "Luna", biography: "Original"});
        const current = {...original, biography: "Updated"};

        expect(buildBabyJournalUpdate(current, original)).toEqual({biography: "Updated"});
    });

    it("uses nested dot-path updates for changed maps where no deletion is required", () => {
        const original = normalizeBabyJournal({
            mother: {name: "Elena", bloodType: "A+", unknownParentField: "preserve"},
            sleepSchedule: {
                "2026-07-12": {daySleeping: "1 nap", nightSleeping: "9h", waysOfSleeping: "Cot", nightSleepingProgress: "Good"},
            },
        });
        const current = normalizeBabyJournal({
            mother: {name: "Elena Marin", bloodType: "A+"},
            sleepSchedule: {
                "2026-07-12": {daySleeping: "2 naps", nightSleeping: "9h", waysOfSleeping: "Cot", nightSleepingProgress: "Good"},
            },
        });

        expect(buildBabyJournalUpdate(current, original)).toEqual({
            "mother.name": "Elena Marin",
            "sleepSchedule.2026-07-12.daySleeping": "2 naps",
        });
    });

    it("keeps an existing empty map as empty", () => {
        const journal = normalizeBabyJournal({sleepSchedule: {}, allergies: {}});

        expect(journal.sleepSchedule).toEqual({});
        expect(journal.allergies).toEqual({});
    });

    it("formats invalid dates with a safe fallback", () => {
        expect(formatJournalDate("not-a-date")).toBe("Not dated");
        expect(formatJournalDate("12.07.2026")).toBe("Jul 12, 2026");
    });

    it("sorts dated maps and finds the latest sleep entry", () => {
        const schedule = {
            "2026-07-10": {daySleeping: "1 nap", nightSleeping: "8h", waysOfSleeping: "Cot", nightSleepingProgress: "Good"},
            "2026-07-12": {daySleeping: "2 naps", nightSleeping: "10h", waysOfSleeping: "Cot", nightSleepingProgress: "Better"},
        };

        expect(sortJournalDateKeysNewestFirst(Object.keys(schedule))).toEqual(["2026-07-12", "2026-07-10"]);
        expect(getLatestSleepEntry(schedule)?.value.daySleeping).toBe("2 naps");
    });

    it("derives milestone ordering and completion without mutating defaults", () => {
        const journal = normalizeBabyJournal({
            ...emptyBabyJournalInformation,
            name: "Luna",
            firstSteps: "2026-06-02",
            firstHeadHold: "2025-05-23",
            profilePicture: [{name: "luna.png", url: "https://example.com/luna.png"}],
        });

        expect(getDatedMilestones(journal).map((milestone) => milestone.label)).toEqual(["First head hold", "First steps"]);
        expect(getBabyJournalCompletion(journal)).toBeGreaterThan(0);
        expect(deriveBabyAgeLabel("2025-03-14", new Date("2026-07-29"))).toBe("16 months");
    });
});
