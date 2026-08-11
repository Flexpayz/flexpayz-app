import {z} from "zod";
import {assetSchema} from "./primitives";

const optionalString = z.string().optional().nullable();
const assetArraySchema = z.array(assetSchema).optional().nullable();

export const investigationRecordSchema = z.object({
    description: optionalString,
    assets: assetArraySchema,
}).passthrough();

export const vitalSignsRecordSchema = z.object({
    bloodPressure: optionalString,
    pulse: optionalString,
    temperature: optionalString,
    respiratoryRate: optionalString,
}).passthrough();

export const consultationRecordSchema = z.object({
    interdisciplinaryConsultation: optionalString,
    recommendation: optionalString,
}).passthrough();

export const followUpRecordSchema = z.object({
    appointments: optionalString,
    monitoringProgress: optionalString,
}).passthrough();

export const sleepScheduleRecordSchema = z.object({
    daySleeping: optionalString,
    nightSleeping: optionalString,
    waysOfSleeping: optionalString,
    nightSleepingProgress: optionalString,
}).passthrough();

const investigationMapSchema = z.record(investigationRecordSchema).optional().nullable();
const vitalSignsMapSchema = z.record(vitalSignsRecordSchema).optional().nullable();
const consultationMapSchema = z.record(consultationRecordSchema).optional().nullable();
const followUpMapSchema = z.record(followUpRecordSchema).optional().nullable();
const sleepScheduleMapSchema = z.record(sleepScheduleRecordSchema).optional().nullable();

export const babyJournalFirestoreSchema = z.object({
    name: optionalString,
    gender: optionalString,
    birthDate: optionalString,
    timeOfBirth: optionalString,
    apgar: optionalString,
    weightOnBirth: optionalString,
    heightOnBirth: optionalString,
    placeOfBirth: optionalString,
    biography: optionalString,
    firstHeadHold: optionalString,
    firstRoll: optionalString,
    firstSit: optionalString,
    firstSteps: optionalString,
    firstRun: optionalString,
    firstBreastfeeding: optionalString,
    firstFormula: optionalString,
    introductionOfCereal: optionalString,
    firstSolidFeeding: optionalString,
    foodPreferences: optionalString,
    foodAversions: optionalString,
    sleepSchedule: sleepScheduleMapSchema,
    mother: z.object({
        profilePicture: assetArraySchema,
        name: optionalString,
        allergies: optionalString,
        diseases: optionalString,
        chronicAversions: optionalString,
        bloodType: optionalString,
    }).passthrough().optional().nullable(),
    father: z.object({
        profilePicture: assetArraySchema,
        name: optionalString,
        allergies: optionalString,
        diseases: optionalString,
        chronicAversions: optionalString,
        bloodType: optionalString,
    }).passthrough().optional().nullable(),
    healthProblems: investigationMapSchema,
    vaccines: investigationMapSchema,
    allergies: investigationMapSchema,
    medication: investigationMapSchema,
    chronicAversions: investigationMapSchema,
    otherHealthConditions: optionalString,
    medicalRecords: assetArraySchema,
    profilePicture: assetArraySchema,
    bloodType: optionalString,
    europeanHealthCard: assetArraySchema,
}).passthrough();

export const adultJournalFirestoreSchema = z.object({
    profilePicture: assetArraySchema,
    name: optionalString,
    birthDate: optionalString,
    gender: optionalString,
    personalIdNumber: optionalString,
    address: optionalString,
    phone: optionalString,
    medicalRecordNumber: optionalString,
    previousConditions: optionalString,
    medication: optionalString,
    allergies: optionalString,
    familyHistory: optionalString,
    vitalSigns: vitalSignsMapSchema,
    generalPhysicalExamination: optionalString,
    laboratoryTests: investigationMapSchema,
    bloodTests: investigationMapSchema,
    biochemistry: investigationMapSchema,
    inflammatoryMarkers: investigationMapSchema,
    tumorMarkers: investigationMapSchema,
    hormonalProfiles: investigationMapSchema,
    urineTests: investigationMapSchema,
    stoolTests: investigationMapSchema,
    coagulationTests: investigationMapSchema,
    INR: investigationMapSchema,
    xRay: investigationMapSchema,
    ultrasound: investigationMapSchema,
    computedTomography: investigationMapSchema,
    magneticResonanceImaging: investigationMapSchema,
    scintigraphy: investigationMapSchema,
    upperDigestiveEndoscopy: investigationMapSchema,
    colonoscopy: investigationMapSchema,
    bronchoscopy: investigationMapSchema,
    electrocardiogram: investigationMapSchema,
    echocardiography: investigationMapSchema,
    spirometry: investigationMapSchema,
    stressTest: investigationMapSchema,
    geneticTests: investigationMapSchema,
    pcrTests: investigationMapSchema,
    boneDensitometry: investigationMapSchema,
    consultations: consultationMapSchema,
    diagnoses: investigationMapSchema,
    medicationTreatment: investigationMapSchema,
    surgicalInterventions: investigationMapSchema,
    lifestyleRecommendations: investigationMapSchema,
    followUp: followUpMapSchema,
    bloodType: optionalString,
    europeanHealthCard: assetArraySchema,
    testMultiple: investigationMapSchema,
}).passthrough();

export type BabyJournalFirestoreData = z.infer<typeof babyJournalFirestoreSchema>;
export type AdultJournalFirestoreData = z.infer<typeof adultJournalFirestoreSchema>;
export type JournalUpdateInput = Record<string, unknown>;
