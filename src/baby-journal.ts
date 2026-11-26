import type {Asset, BabyJournalInformation, MultipleSleepSchedule, SleepSchedule} from "./components/baby-journal-settings";
import type {MultipleInvestigations} from "./components/adult-journal-settings";

type RawRecord = Record<string, unknown>;

export const babyJournalTopLevelFields = [
    "name",
    "gender",
    "birthDate",
    "timeOfBirth",
    "apgar",
    "weightOnBirth",
    "heightOnBirth",
    "placeOfBirth",
    "biography",
    "firstHeadHold",
    "firstRoll",
    "firstSit",
    "firstSteps",
    "firstRun",
    "firstBreastfeeding",
    "firstFormula",
    "introductionOfCereal",
    "firstSolidFeeding",
    "foodPreferences",
    "foodAversions",
    "sleepSchedule",
    "mother",
    "father",
    "healthProblems",
    "vaccines",
    "allergies",
    "medication",
    "chronicAversions",
    "otherHealthConditions",
    "medicalRecords",
    "profilePicture",
    "bloodType",
    "europeanHealthCard",
] as const;

export type BabyJournalTopLevelField = typeof babyJournalTopLevelFields[number];

export const emptyBabyJournalInformation: BabyJournalInformation = {
    name: "",
    gender: "",
    birthDate: "",
    timeOfBirth: "",
    apgar: "",
    weightOnBirth: "",
    heightOnBirth: "",
    placeOfBirth: "",
    biography: "",
    firstHeadHold: "",
    firstRoll: "",
    firstSit: "",
    firstSteps: "",
    firstRun: "",
    firstBreastfeeding: "",
    firstFormula: "",
    introductionOfCereal: "",
    firstSolidFeeding: "",
    foodPreferences: "",
    foodAversions: "",
    sleepSchedule: {},
    mother: {
        profilePicture: [],
        name: "",
        allergies: "",
        diseases: "",
        chronicAversions: "",
        bloodType: "",
    },
    father: {
        profilePicture: [],
        name: "",
        allergies: "",
        diseases: "",
        chronicAversions: "",
        bloodType: "",
    },
    healthProblems: {},
    vaccines: {},
    allergies: {},
    medication: {},
    chronicAversions: {},
    otherHealthConditions: "",
    medicalRecords: [],
    profilePicture: [],
    bloodType: "",
    europeanHealthCard: [],
};

export const healthInvestigationFields = [
    "healthProblems",
    "vaccines",
    "allergies",
    "medication",
    "chronicAversions",
] as const;

export const babyMilestones = [
    {field: "firstHeadHold", label: "First head hold"},
    {field: "firstRoll", label: "First roll"},
    {field: "firstSit", label: "First sit"},
    {field: "firstSteps", label: "First steps"},
    {field: "firstRun", label: "First run"},
] as const;

export const babyFeedingFields = [
    {field: "firstBreastfeeding", label: "First breastfeeding"},
    {field: "firstFormula", label: "First formula"},
    {field: "introductionOfCereal", label: "Introduction of cereal"},
    {field: "firstSolidFeeding", label: "First solid feeding"},
    {field: "foodPreferences", label: "Food preferences"},
    {field: "foodAversions", label: "Food aversions"},
] as const;

export const healthCategories = [
    {field: "vaccines", label: "Vaccines", empty: "No vaccine records"},
    {field: "allergies", label: "Allergies", empty: "No allergies recorded"},
    {field: "healthProblems", label: "Health problems", empty: "No health problems recorded"},
    {field: "medication", label: "Medication", empty: "No medication records"},
    {field: "chronicAversions", label: "Chronic adverse reactions", empty: "No adverse reactions recorded"},
] as const;

function isRecord(value: unknown): value is RawRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function normalizeAssets(value: unknown): Asset[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((asset, index) => {
            if (!isRecord(asset)) return null;
            const url = asString(asset.url);
            if (!url) return null;
            return {
                url,
                name: asString(asset.name) || `Uploaded file ${index + 1}`,
            };
        })
        .filter((asset): asset is Asset => Boolean(asset));
}

function normalizeParent(value: unknown): BabyJournalInformation["mother"] {
    const record = isRecord(value) ? value : {};
    return {
        profilePicture: normalizeAssets(record.profilePicture),
        name: asString(record.name),
        allergies: asString(record.allergies),
        diseases: asString(record.diseases),
        chronicAversions: asString(record.chronicAversions),
        bloodType: asString(record.bloodType),
    };
}

function normalizeInvestigationMap(value: unknown): MultipleInvestigations {
    if (!isRecord(value)) return {};
    return Object.entries(value).reduce<MultipleInvestigations>((result, [dateKey, entry]) => {
        if (!dateKey || !isRecord(entry)) return result;
        result[dateKey] = {
            description: asString(entry.description),
            assets: normalizeAssets(entry.assets),
        };
        return result;
    }, {});
}

function normalizeSleepSchedule(value: unknown): MultipleSleepSchedule {
    if (!isRecord(value)) return {};
    return Object.entries(value).reduce<MultipleSleepSchedule>((result, [dateKey, entry]) => {
        if (!dateKey || !isRecord(entry)) return result;
        result[dateKey] = {
            daySleeping: asString(entry.daySleeping),
            nightSleeping: asString(entry.nightSleeping),
            waysOfSleeping: asString(entry.waysOfSleeping),
            nightSleepingProgress: asString(entry.nightSleepingProgress),
        };
        return result;
    }, {});
}

export function normalizeBabyJournal(raw: unknown): BabyJournalInformation {
    const record = isRecord(raw) ? raw : {};
    return {
        ...emptyBabyJournalInformation,
        name: asString(record.name),
        gender: asString(record.gender),
        birthDate: asString(record.birthDate),
        timeOfBirth: asString(record.timeOfBirth),
        apgar: asString(record.apgar),
        weightOnBirth: asString(record.weightOnBirth),
        heightOnBirth: asString(record.heightOnBirth),
        placeOfBirth: asString(record.placeOfBirth),
        biography: asString(record.biography),
        firstHeadHold: asString(record.firstHeadHold),
        firstRoll: asString(record.firstRoll),
        firstSit: asString(record.firstSit),
        firstSteps: asString(record.firstSteps),
        firstRun: asString(record.firstRun),
        firstBreastfeeding: asString(record.firstBreastfeeding),
        firstFormula: asString(record.firstFormula),
        introductionOfCereal: asString(record.introductionOfCereal),
        firstSolidFeeding: asString(record.firstSolidFeeding),
        foodPreferences: asString(record.foodPreferences),
        foodAversions: asString(record.foodAversions),
        sleepSchedule: normalizeSleepSchedule(record.sleepSchedule),
        mother: normalizeParent(record.mother),
        father: normalizeParent(record.father),
        healthProblems: normalizeInvestigationMap(record.healthProblems),
        vaccines: normalizeInvestigationMap(record.vaccines),
        allergies: normalizeInvestigationMap(record.allergies),
        medication: normalizeInvestigationMap(record.medication),
        chronicAversions: normalizeInvestigationMap(record.chronicAversions),
        otherHealthConditions: asString(record.otherHealthConditions),
        medicalRecords: normalizeAssets(record.medicalRecords),
        profilePicture: normalizeAssets(record.profilePicture),
        bloodType: asString(record.bloodType),
        europeanHealthCard: normalizeAssets(record.europeanHealthCard),
    };
}

export function buildBabyJournalUpdate(
    current: BabyJournalInformation,
    original: BabyJournalInformation,
): Record<string, unknown> {
    return babyJournalTopLevelFields.reduce<Record<string, unknown>>((updates, field) => {
        collectDiff(String(field), current[field], original[field], updates);
        return updates;
    }, {});
}

function collectDiff(path: string, currentValue: unknown, originalValue: unknown, updates: Record<string, unknown>) {
    if (JSON.stringify(currentValue) === JSON.stringify(originalValue)) return;
    if (Array.isArray(currentValue) || Array.isArray(originalValue) || !isRecord(currentValue) || !isRecord(originalValue)) {
        updates[path] = currentValue;
        return;
    }

    const currentKeys = Object.keys(currentValue);
    const originalKeys = Object.keys(originalValue);
    const removedKeys = originalKeys.filter((key) => !currentKeys.includes(key));
    if (removedKeys.length > 0) {
        updates[path] = currentValue;
        return;
    }

    currentKeys.forEach((key) => {
        collectDiff(`${path}.${key}`, currentValue[key], originalValue[key], updates);
    });
}

export function hasBabyJournalChanges(current: BabyJournalInformation, original: BabyJournalInformation): boolean {
    return Object.keys(buildBabyJournalUpdate(current, original)).length > 0;
}

export function parseJournalDate(value: string): Date | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const dotMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (dotMatch && !/^\d{4}[./-]/.test(trimmed)) {
        const [, day, month, year] = dotMatch;
        const normalizedYear = year.length === 2 ? `20${year}` : year;
        const parsed = new Date(Number(normalizedYear), Number(month) - 1, Number(day));
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) return direct;
    return null;
}

export function formatJournalDate(value: string, fallback = "Not dated"): string {
    const parsed = parseJournalDate(value);
    if (!parsed) return fallback;
    return new Intl.DateTimeFormat("en", {day: "2-digit", month: "short", year: "numeric"}).format(parsed);
}

export function deriveBabyAgeLabel(birthDate: string, now = new Date()): string {
    const parsed = parseJournalDate(birthDate);
    if (!parsed) return "";
    const months = Math.max(0, (now.getFullYear() - parsed.getFullYear()) * 12 + now.getMonth() - parsed.getMonth());
    if (months < 1) return "newborn";
    if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? "" : "s"}`;
}

export function sortJournalDateKeysNewestFirst(keys: string[]): string[] {
    return [...keys].sort((a, b) => {
        const first = parseJournalDate(a)?.getTime() ?? Number.NEGATIVE_INFINITY;
        const second = parseJournalDate(b)?.getTime() ?? Number.NEGATIVE_INFINITY;
        return second - first;
    });
}

export function getLatestSleepEntry(schedule: MultipleSleepSchedule): {dateKey: string; value: SleepSchedule} | null {
    const firstKey = sortJournalDateKeysNewestFirst(Object.keys(schedule))[0];
    if (!firstKey) return null;
    return {dateKey: firstKey, value: schedule[firstKey]};
}

export function getDatedMilestones(journal: BabyJournalInformation) {
    return babyMilestones
        .map((milestone) => ({
            ...milestone,
            value: asString(journal[milestone.field]),
            date: parseJournalDate(asString(journal[milestone.field])),
        }))
        .filter((milestone) => milestone.value)
        .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
}

export function countInvestigationEntries(value: MultipleInvestigations): number {
    return Object.values(value).filter((entry) => Boolean(entry.description || entry.assets?.length)).length;
}

export function countCompletedBabyJournalFields(journal: BabyJournalInformation): number {
    const scalarFields: BabyJournalTopLevelField[] = [
        "name",
        "gender",
        "birthDate",
        "timeOfBirth",
        "apgar",
        "weightOnBirth",
        "heightOnBirth",
        "placeOfBirth",
        "biography",
        "bloodType",
        "firstHeadHold",
        "firstSit",
        "firstSteps",
        "foodPreferences",
    ];
    const scalarCount = scalarFields.filter((field) => Boolean(journal[field])).length;
    const assetCount = journal.profilePicture.length > 0 ? 1 : 0;
    const sleepCount = Object.keys(journal.sleepSchedule).length > 0 ? 1 : 0;
    const healthCount = healthInvestigationFields.reduce((count, field) => count + (countInvestigationEntries(journal[field]) > 0 ? 1 : 0), 0);
    return scalarCount + assetCount + sleepCount + healthCount;
}

export function getBabyJournalCompletion(journal: BabyJournalInformation): number {
    const total = 22;
    return Math.min(100, Math.round((countCompletedBabyJournalFields(journal) / total) * 100));
}
