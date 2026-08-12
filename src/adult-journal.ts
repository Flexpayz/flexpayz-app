import type {Asset} from "./components/baby-journal-settings";
import type {AdultJournalInformation, Consultation, FollowUp, Multiple, MultipleInvestigations, VitalSigns} from "./components/adult-journal-settings";
import {parseJournalDate} from "./baby-journal";

type RawRecord = Record<string, unknown>;

export const adultJournalTopLevelFields = [
    "profilePicture",
    "name",
    "birthDate",
    "gender",
    "personalIdNumber",
    "address",
    "phone",
    "medicalRecordNumber",
    "previousConditions",
    "medication",
    "allergies",
    "familyHistory",
    "vitalSigns",
    "generalPhysicalExamination",
    "laboratoryTests",
    "bloodTests",
    "biochemistry",
    "inflammatoryMarkers",
    "tumorMarkers",
    "hormonalProfiles",
    "urineTests",
    "stoolTests",
    "coagulationTests",
    "INR",
    "xRay",
    "ultrasound",
    "computedTomography",
    "magneticResonanceImaging",
    "scintigraphy",
    "upperDigestiveEndoscopy",
    "colonoscopy",
    "bronchoscopy",
    "electrocardiogram",
    "echocardiography",
    "spirometry",
    "stressTest",
    "geneticTests",
    "pcrTests",
    "boneDensitometry",
    "consultations",
    "diagnoses",
    "medicationTreatment",
    "surgicalInterventions",
    "lifestyleRecommendations",
    "followUp",
    "bloodType",
    "europeanHealthCard",
    "testMultiple",
] as const;

export type AdultJournalField = typeof adultJournalTopLevelFields[number];
export type InvestigationField = Extract<AdultJournalField,
    "laboratoryTests" | "bloodTests" | "biochemistry" | "inflammatoryMarkers" | "tumorMarkers" | "hormonalProfiles" |
    "urineTests" | "stoolTests" | "coagulationTests" | "INR" | "xRay" | "ultrasound" | "computedTomography" |
    "magneticResonanceImaging" | "scintigraphy" | "upperDigestiveEndoscopy" | "colonoscopy" | "bronchoscopy" |
    "electrocardiogram" | "echocardiography" | "spirometry" | "stressTest" | "geneticTests" | "pcrTests" |
    "boneDensitometry" | "diagnoses" | "medicationTreatment" | "surgicalInterventions" | "lifestyleRecommendations" | "testMultiple">;

export const emptyAdultJournalInformation: AdultJournalInformation = {
    profilePicture: [],
    name: "",
    birthDate: "",
    gender: "",
    personalIdNumber: "",
    address: "",
    phone: "",
    medicalRecordNumber: "",
    previousConditions: "",
    medication: "",
    allergies: "",
    familyHistory: "",
    vitalSigns: {},
    generalPhysicalExamination: "",
    laboratoryTests: {},
    bloodTests: {},
    biochemistry: {},
    inflammatoryMarkers: {},
    tumorMarkers: {},
    hormonalProfiles: {},
    urineTests: {},
    stoolTests: {},
    coagulationTests: {},
    INR: {},
    xRay: {},
    ultrasound: {},
    computedTomography: {},
    magneticResonanceImaging: {},
    scintigraphy: {},
    upperDigestiveEndoscopy: {},
    colonoscopy: {},
    bronchoscopy: {},
    electrocardiogram: {},
    echocardiography: {},
    spirometry: {},
    stressTest: {},
    geneticTests: {},
    pcrTests: {},
    boneDensitometry: {},
    consultations: {},
    diagnoses: {},
    medicationTreatment: {},
    surgicalInterventions: {},
    lifestyleRecommendations: {},
    followUp: {},
    bloodType: "",
    europeanHealthCard: [],
    testMultiple: {},
};

export const investigationGroups = [
    {
        id: "laboratory",
        label: "Laboratory",
        fields: [
            ["laboratoryTests", "Laboratory Tests"],
            ["bloodTests", "Blood Tests"],
            ["biochemistry", "Biochemistry"],
            ["inflammatoryMarkers", "Inflammatory Markers"],
            ["tumorMarkers", "Tumor Markers"],
            ["hormonalProfiles", "Hormonal Profiles"],
            ["urineTests", "Urine Tests"],
            ["stoolTests", "Stool Tests"],
            ["coagulationTests", "Coagulation Tests"],
            ["INR", "INR"],
        ],
    },
    {
        id: "imaging",
        label: "Imaging",
        fields: [
            ["xRay", "X-Ray"],
            ["ultrasound", "Ultrasound"],
            ["computedTomography", "Computed Tomography"],
            ["magneticResonanceImaging", "Magnetic Resonance Imaging"],
            ["scintigraphy", "Scintigraphy"],
        ],
    },
    {
        id: "endoscopy",
        label: "Endoscopy",
        fields: [
            ["upperDigestiveEndoscopy", "Upper Digestive Endoscopy"],
            ["colonoscopy", "Colonoscopy"],
            ["bronchoscopy", "Bronchoscopy"],
        ],
    },
    {
        id: "functional",
        label: "Functional",
        fields: [
            ["electrocardiogram", "Electrocardiogram"],
            ["echocardiography", "Echocardiography"],
            ["spirometry", "Spirometry"],
            ["stressTest", "Stress Test"],
        ],
    },
    {
        id: "advanced",
        label: "Advanced and molecular",
        fields: [
            ["geneticTests", "Genetic Tests"],
            ["pcrTests", "PCR Tests"],
            ["boneDensitometry", "Bone Densitometry"],
            ["testMultiple", "Additional legacy records"],
        ],
    },
] as const satisfies ReadonlyArray<{id: string; label: string; fields: ReadonlyArray<readonly [InvestigationField, string]>}>;

export const careSections = [
    ["diagnoses", "Diagnoses"],
    ["medicationTreatment", "Medication Treatment"],
    ["surgicalInterventions", "Surgical Interventions"],
    ["lifestyleRecommendations", "Lifestyle Recommendations"],
] as const satisfies ReadonlyArray<readonly [InvestigationField, string]>;

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
            return {url, name: asString(asset.name) || `Uploaded file ${index + 1}`};
        })
        .filter((asset): asset is Asset => Boolean(asset));
}

function normalizeInvestigations(value: unknown): MultipleInvestigations {
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

function normalizeVitalSigns(value: unknown): Multiple<VitalSigns> {
    if (!isRecord(value)) return {};
    return Object.entries(value).reduce<Multiple<VitalSigns>>((result, [dateKey, entry]) => {
        if (!dateKey || !isRecord(entry)) return result;
        result[dateKey] = {
            bloodPressure: asString(entry.bloodPressure),
            pulse: asString(entry.pulse),
            temperature: asString(entry.temperature),
            respiratoryRate: asString(entry.respiratoryRate),
        };
        return result;
    }, {});
}

function normalizeConsultations(value: unknown): Multiple<Consultation> {
    if (!isRecord(value)) return {};
    return Object.entries(value).reduce<Multiple<Consultation>>((result, [dateKey, entry]) => {
        if (!dateKey || !isRecord(entry)) return result;
        result[dateKey] = {
            interdisciplinaryConsultation: asString(entry.interdisciplinaryConsultation),
            recommendation: asString(entry.recommendation),
        };
        return result;
    }, {});
}

function normalizeFollowUp(value: unknown): Multiple<FollowUp> {
    if (!isRecord(value)) return {};
    return Object.entries(value).reduce<Multiple<FollowUp>>((result, [dateKey, entry]) => {
        if (!dateKey || !isRecord(entry)) return result;
        result[dateKey] = {
            appointments: asString(entry.appointments),
            monitoringProgress: asString(entry.monitoringProgress),
        };
        return result;
    }, {});
}

export function normalizeAdultJournal(raw: unknown): AdultJournalInformation {
    const record = isRecord(raw) ? raw : {};
    const investigationValues: Partial<Record<InvestigationField, MultipleInvestigations>> = {};
    investigationGroups.forEach((group) => {
        group.fields.forEach(([field]) => {
            investigationValues[field] = normalizeInvestigations(record[field]);
        });
    });
    careSections.forEach(([field]) => {
        investigationValues[field] = normalizeInvestigations(record[field]);
    });

    return {
        ...emptyAdultJournalInformation,
        ...investigationValues,
        profilePicture: normalizeAssets(record.profilePicture),
        name: asString(record.name),
        birthDate: asString(record.birthDate),
        gender: asString(record.gender),
        personalIdNumber: asString(record.personalIdNumber),
        address: asString(record.address),
        phone: asString(record.phone),
        medicalRecordNumber: asString(record.medicalRecordNumber),
        previousConditions: asString(record.previousConditions),
        medication: asString(record.medication),
        allergies: asString(record.allergies),
        familyHistory: asString(record.familyHistory),
        vitalSigns: normalizeVitalSigns(record.vitalSigns),
        generalPhysicalExamination: asString(record.generalPhysicalExamination),
        consultations: normalizeConsultations(record.consultations),
        followUp: normalizeFollowUp(record.followUp),
        bloodType: asString(record.bloodType),
        europeanHealthCard: normalizeAssets(record.europeanHealthCard),
    };
}

export function buildAdultJournalUpdate(current: AdultJournalInformation, original: AdultJournalInformation): Record<string, unknown> {
    return adultJournalTopLevelFields.reduce<Record<string, unknown>>((updates, field) => {
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
    if (originalKeys.some((key) => !currentKeys.includes(key))) {
        updates[path] = currentValue;
        return;
    }
    currentKeys.forEach((key) => collectDiff(`${path}.${key}`, currentValue[key], originalValue[key], updates));
}

export function hasAdultJournalChanges(current: AdultJournalInformation, original: AdultJournalInformation): boolean {
    return Object.keys(buildAdultJournalUpdate(current, original)).length > 0;
}

export function sortAdultDateKeysNewestFirst(keys: string[]) {
    return [...keys].sort((a, b) => {
        const first = parseJournalDate(a)?.getTime() ?? Number.NEGATIVE_INFINITY;
        const second = parseJournalDate(b)?.getTime() ?? Number.NEGATIVE_INFINITY;
        return second - first || b.localeCompare(a);
    });
}

export function formatAdultDate(value: string, fallback = "Not dated") {
    const parsed = parseJournalDate(value);
    if (!parsed) return fallback;
    return new Intl.DateTimeFormat("en", {day: "2-digit", month: "short", year: "numeric"}).format(parsed);
}

export function getLatestVitalSigns(vitalSigns: Multiple<VitalSigns>) {
    const dateKey = sortAdultDateKeysNewestFirst(Object.keys(vitalSigns))[0];
    if (!dateKey) return null;
    return {dateKey, value: vitalSigns[dateKey]};
}

export function countInvestigationRecords(records: MultipleInvestigations) {
    return Object.values(records).filter((record) => Boolean(record.description || record.assets?.length)).length;
}

export function countInvestigationAssets(records: MultipleInvestigations) {
    return Object.values(records).reduce((count, record) => count + (record.assets?.length || 0), 0);
}

export function latestRecordDate(records: MultipleInvestigations) {
    return sortAdultDateKeysNewestFirst(Object.keys(records))[0] || "";
}

export function maskPersonalId(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "Not recorded";
    const visible = trimmed.slice(-Math.min(4, Math.max(1, Math.floor(trimmed.length / 3))));
    return `${"•".repeat(Math.max(4, trimmed.length - visible.length))}${visible}`;
}

export function getAdultJournalCompletion(journal: AdultJournalInformation) {
    const meaningful = [
        journal.name,
        journal.birthDate,
        journal.gender,
        journal.bloodType,
        journal.phone,
        journal.medicalRecordNumber,
        journal.previousConditions,
        journal.medication,
        journal.allergies,
        journal.familyHistory,
        journal.generalPhysicalExamination,
        Object.keys(journal.vitalSigns).length ? "vital" : "",
        journal.europeanHealthCard.length ? "card" : "",
        investigationGroups.some((group) => group.fields.some(([field]) => countInvestigationRecords(journal[field]) > 0)) ? "tests" : "",
        journal.consultations && Object.keys(journal.consultations).length ? "consult" : "",
        careSections.some(([field]) => countInvestigationRecords(journal[field]) > 0) ? "care" : "",
        Object.keys(journal.followUp).length ? "follow-up" : "",
    ];
    return Math.min(100, Math.round((meaningful.filter(Boolean).length / meaningful.length) * 100));
}
