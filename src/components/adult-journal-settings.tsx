import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {LoadingScreenContext} from "./loading-sreen";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {doc, getDoc} from "firebase/firestore";
import {db} from "../App";
import {
    Asset,
    BabyJournalInformation,
    BabyJournalStateContext,
    DB_COLLECTIONS,
    EditContext
} from "./baby-journal-settings";
import {useNavigate} from "react-router";
import {getProductIdFromURL} from "../utils";
import {AdultJournalWorkspace} from "./adult-journal-workspace";
export function AdultJournalSettings() {
    return <AdultJournalWorkspace/>
}

export interface Investigation {
    description: string,
    assets: Asset[]
}

export interface Multiple<T> {
    [key: string]: T
}

export interface MultipleHandler<T> {
    onDelete: (dateKey: string) => void,
    onAdd: (dateKey: string) => void,
    dates: {
        [key: string]: T
    }
}

export interface Consultation {
    interdisciplinaryConsultation: string,
    recommendation: string,
}

export interface ConsultationHandler {
    interdisciplinaryConsultation: EditContext<string>,
    recommendation: EditContext<string>,
}

export interface FollowUp {
    appointments: string,
    monitoringProgress: string,
}

export interface FollowUpHandler {
    appointments: EditContext<string>,
    monitoringProgress: EditContext<string>,
}


export interface MultipleInvestigations {
    [key: string]: Investigation
}

const defaultInvestigation: Investigation = {
    description: "",
    assets: []
}


const defaultVitalSigns: VitalSigns = {
    bloodPressure: "",
    pulse: "",
    temperature: "",
    respiratoryRate: ""
}

const defaultConsultation: Consultation = {
    interdisciplinaryConsultation: "",
    recommendation: ""
}

const defaultFollowUp: FollowUp = {
    appointments: "",
    monitoringProgress: ""
}


const defaultSleepSchedule: SleepSchedule = {
    daySleeping: "",
    nightSleeping: "",
    waysOfSleeping: "",
    nightSleepingProgress: "",
}
export const defaultMultipleInvestigations: MultipleInvestigations = {}

interface SleepSchedule {
    daySleeping: string,
    nightSleeping: string,
    waysOfSleeping: string,
    nightSleepingProgress: string,
}

export interface VitalSigns {
    bloodPressure: string,
    pulse: string,
    temperature: string,
    respiratoryRate: string,
}

export interface MultipleVitalSigns {
    [key: string]: VitalSigns
}

export interface AdultJournalInformation {
    profilePicture: Asset[],
    name: string,
    birthDate: string,
    gender: string,
    personalIdNumber: string,
    address: string,
    phone: string,
    medicalRecordNumber: string,
    previousConditions: string,
    medication: string,
    allergies: string,
    familyHistory: string,
    vitalSigns: MultipleVitalSigns
    // bloodPressure: string,
    // pulse: string,
    // temperature: string,
    // respiratoryRate: string,
    generalPhysicalExamination: string,
    laboratoryTests: MultipleInvestigations,
    bloodTests: MultipleInvestigations,
    biochemistry: MultipleInvestigations,
    inflammatoryMarkers: MultipleInvestigations,
    tumorMarkers: MultipleInvestigations,
    hormonalProfiles: MultipleInvestigations,
    urineTests: MultipleInvestigations,
    stoolTests: MultipleInvestigations,
    coagulationTests: MultipleInvestigations,
    INR: MultipleInvestigations,
    xRay: MultipleInvestigations,
    ultrasound: MultipleInvestigations,
    computedTomography: MultipleInvestigations,
    magneticResonanceImaging: MultipleInvestigations,
    scintigraphy: MultipleInvestigations,
    upperDigestiveEndoscopy: MultipleInvestigations,
    colonoscopy: MultipleInvestigations,
    bronchoscopy: MultipleInvestigations,
    electrocardiogram: MultipleInvestigations,
    echocardiography: MultipleInvestigations,
    spirometry: MultipleInvestigations,
    stressTest: MultipleInvestigations,
    geneticTests: MultipleInvestigations,
    pcrTests: MultipleInvestigations,
    boneDensitometry: MultipleInvestigations,
    // interdisciplinaryConsultations: string,
    // recommendations: string,
    consultations: Multiple<Consultation>
    // primaryDiagnosis: string,
    // secondaryDiagnosis: string,
    diagnoses: MultipleInvestigations
    medicationTreatment: MultipleInvestigations,
    surgicalInterventions: MultipleInvestigations,
    lifestyleRecommendations: MultipleInvestigations,
    // appointments: string,
    // monitoringProgress: string,
    followUp: Multiple<FollowUp>
    bloodType: string,
    europeanHealthCard: Asset[],
    testMultiple: MultipleInvestigations
}

export const defaultInformation: AdultJournalInformation = {
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
    // bloodPressure: "",
    // pulse: "",
    // temperature: "",
    // respiratoryRate: "",
    generalPhysicalExamination: "",
    laboratoryTests: defaultMultipleInvestigations,
    bloodTests: defaultMultipleInvestigations,
    biochemistry: defaultMultipleInvestigations,
    inflammatoryMarkers: defaultMultipleInvestigations,
    tumorMarkers: defaultMultipleInvestigations,
    hormonalProfiles: defaultMultipleInvestigations,
    urineTests: defaultMultipleInvestigations,
    stoolTests: defaultMultipleInvestigations,
    coagulationTests: defaultMultipleInvestigations,
    INR: defaultMultipleInvestigations,
    xRay: defaultMultipleInvestigations,
    ultrasound: defaultMultipleInvestigations,
    computedTomography: defaultMultipleInvestigations,
    magneticResonanceImaging: defaultMultipleInvestigations,
    scintigraphy: defaultMultipleInvestigations,
    upperDigestiveEndoscopy: defaultMultipleInvestigations,
    colonoscopy: defaultMultipleInvestigations,
    bronchoscopy: defaultMultipleInvestigations,
    electrocardiogram: defaultMultipleInvestigations,
    echocardiography: defaultMultipleInvestigations,
    spirometry: defaultMultipleInvestigations,
    stressTest: defaultMultipleInvestigations,
    geneticTests: defaultMultipleInvestigations,
    pcrTests: defaultMultipleInvestigations,
    boneDensitometry: defaultMultipleInvestigations,
    // interdisciplinaryConsultations: "",
    // recommendations: "",
    consultations: {},
    // primaryDiagnosis: "",
    // secondaryDiagnosis: "",
    diagnoses: defaultMultipleInvestigations,
    medicationTreatment: defaultMultipleInvestigations,
    surgicalInterventions: defaultMultipleInvestigations,
    lifestyleRecommendations: defaultMultipleInvestigations,
    followUp: {},
    // appointments: "",
    // monitoringProgress: "",
    bloodType: "",
    europeanHealthCard: [],
    testMultiple: defaultMultipleInvestigations
}

export interface InvestigationHandler {
    description: EditContext<string>,
    assets: EditContext<Asset[]>
}

export interface SleepScheduleHandler {
    daySleeping: EditContext<string>,
    nightSleeping: EditContext<string>,
    waysOfSleeping: EditContext<string>,
    nightSleepingProgress: EditContext<string>,
}

export interface VitalSignsHandler {
    bloodPressure: EditContext<string>,
    pulse: EditContext<string>,
    temperature: EditContext<string>,
    respiratoryRate: EditContext<string>,
}

export interface MultipleVitalSignsHandler {
    onDelete: (dateKey: string) => void
    onAdd: (dateKey: string) => void,
    signs: {
        [key: string]: VitalSignsHandler
    }
}

interface useAdultJournalEditInterface {
    profilePicture: EditContext<Asset[]>,
    name: EditContext<string>,
    birthDate: EditContext<string>,
    gender: EditContext<string>,
    personalIdNumber: EditContext<string>,
    address: EditContext<string>,
    phone: EditContext<string>,
    medicalRecordNumber: EditContext<string>,
    previousConditions: EditContext<string>,
    medication: EditContext<string>,
    allergies: EditContext<string>,
    familyHistory: EditContext<string>,
    // bloodPressure: EditContext<string>,
    // pulse: EditContext<string>,
    // temperature: EditContext<string>,
    // respiratoryRate: EditContext<string>,
    generalPhysicalExamination: EditContext<string>,
    laboratoryTests: MultipleInvestigationsHandler,
    bloodTests: MultipleInvestigationsHandler,
    biochemistry: MultipleInvestigationsHandler,
    inflammatoryMarkers: MultipleInvestigationsHandler,
    tumorMarkers: MultipleInvestigationsHandler,
    hormonalProfiles: MultipleInvestigationsHandler,
    urineTests: MultipleInvestigationsHandler,
    stoolTests: MultipleInvestigationsHandler,
    coagulationTests: MultipleInvestigationsHandler,
    INR: MultipleInvestigationsHandler,
    xRay: MultipleInvestigationsHandler,
    ultrasound: MultipleInvestigationsHandler,
    computedTomography: MultipleInvestigationsHandler,
    magneticResonanceImaging: MultipleInvestigationsHandler,
    scintigraphy: MultipleInvestigationsHandler,
    upperDigestiveEndoscopy: MultipleInvestigationsHandler,
    colonoscopy: MultipleInvestigationsHandler,
    bronchoscopy: MultipleInvestigationsHandler,
    electrocardiogram: MultipleInvestigationsHandler,
    echocardiography: MultipleInvestigationsHandler,
    spirometry: MultipleInvestigationsHandler,
    stressTest: MultipleInvestigationsHandler,
    geneticTests: MultipleInvestigationsHandler,
    pcrTests: MultipleInvestigationsHandler,
    boneDensitometry: MultipleInvestigationsHandler,
    // interdisciplinaryConsultations: EditContext<string>,
    // recommendations: EditContext<string>,
    consultations: MultipleHandler<ConsultationHandler>
    // primaryDiagnosis: EditContext<string>,
    // secondaryDiagnosis: EditContext<string>,
    diagnoses: MultipleInvestigationsHandler,
    medicationTreatment: MultipleInvestigationsHandler,
    surgicalInterventions: MultipleInvestigationsHandler,
    lifestyleRecommendations: MultipleInvestigationsHandler,
    // appointments: EditContext<string>,
    // monitoringProgress: EditContext<string>,
    followUp: MultipleHandler<FollowUpHandler>,
    bloodType: EditContext<string>,
    europeanHealthCard: EditContext<Asset[]>,
    testMultiple: MultipleInvestigationsHandler,
    vitalSigns: MultipleVitalSignsHandler,
}

interface UseAdultJournalInformationValue {
    originalJournalState: AdultJournalInformation
    adultJournalState: AdultJournalInformation,
    setAdultJournalState: any,
    setOriginalJournalState: any
}

export interface MultipleInvestigationsHandler {
    onDelete: (dateKey: string) => void
    onAdd: (dateKey: string) => void,
    investigations: {
        [key: string]: InvestigationHandler
    }
}

export interface MultipleSleepScheduleHandler {
    onDelete: (dateKey: string) => void
    onAdd: (dateKey: string) => void,
    schedules: {
        [key: string]: SleepScheduleHandler
    }
}

function useCreateMultipleInvestigationsHandler(field: keyof AdultJournalInformation): MultipleInvestigationsHandler {
    const {adultJournalState, setAdultJournalState} = useContext(AdultJournalStateContext)
    let tempInvestigations: { [key: string]: InvestigationHandler } = {}
    const useGetInvestigations = () => {
        return (): { [key: string]: InvestigationHandler } => {
            const keys = Object.keys(adultJournalState[field])
            tempInvestigations = {}
            keys.forEach((key: string) => {
                tempInvestigations[key] = {
                    description: {
                        value: (adultJournalState[field] as MultipleInvestigations)[key].description,
                        onChange: (description: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                [field]: {
                                    ...(prev[field] as MultipleInvestigations),
                                    [key]: {
                                        ...(prev[field] as MultipleInvestigations)[key],
                                        description
                                    }
                                }
                            }))
                        }
                    },
                    assets: {
                        value: (adultJournalState[field] as MultipleInvestigations)[key].assets,
                        onChange: (assets: Asset[]) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                [field]: {
                                    ...(prev[field] as MultipleInvestigations),
                                    [key]: {
                                        ...(prev[field] as MultipleInvestigations)[key],
                                        assets
                                    }
                                }
                            }))
                        }
                    }

                }
            })
            return tempInvestigations
        }
    }

    const onAdd = useCallback((dateKey: string) => {
        setAdultJournalState((prev: AdultJournalInformation) => ({
            ...prev,
            [field]: {
                ...(prev[field] as MultipleInvestigations),
                [dateKey]: defaultInvestigation
            }
        }))
    }, [])

    const onDelete = useCallback((dateKey: string) => {
        setAdultJournalState((prev: AdultJournalInformation) => {
            const {[dateKey]: _, ...investigationsLeft} = prev[field] as MultipleInvestigations
            return {
                ...prev,
                [field]: investigationsLeft
            }
        })
    }, [])

    const getInvestigations = useGetInvestigations()
    // console.log("Multiple, inves", investigations)
    return useMemo(() => ({
        onDelete,
        onAdd,
        investigations: getInvestigations()
    }), [onAdd, getInvestigations, onDelete])
}


function useCreateMultipleVitalSignHandler(): MultipleVitalSignsHandler {
    const {adultJournalState, setAdultJournalState} = useContext(AdultJournalStateContext)
    let tempInvestigations: { [key: string]: VitalSignsHandler } = {}
    const useGetSigns = () => {
        return (): { [key: string]: VitalSignsHandler } => {
            const keys = Object.keys(adultJournalState.vitalSigns)
            tempInvestigations = {}
            keys.forEach((key: string) => {
                tempInvestigations[key] = {
                    bloodPressure: {
                        value: adultJournalState.vitalSigns[key].bloodPressure,
                        onChange: (bloodPressure: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                vitalSigns: {
                                    ...prev.vitalSigns,
                                    [key]: {
                                        ...prev.vitalSigns[key],
                                        bloodPressure
                                    }
                                }
                            }))
                        }
                    },
                    pulse: {
                        value: adultJournalState.vitalSigns[key].pulse,
                        onChange: (pulse: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                vitalSigns: {
                                    ...prev.vitalSigns,
                                    [key]: {
                                        ...prev.vitalSigns[key],
                                        pulse
                                    }
                                }
                            }))
                        }
                    },
                    temperature: {
                        value: adultJournalState.vitalSigns[key].temperature,
                        onChange: (temperature: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                vitalSigns: {
                                    ...prev.vitalSigns,
                                    [key]: {
                                        ...prev.vitalSigns[key],
                                        temperature
                                    }
                                }
                            }))
                        }
                    },
                    respiratoryRate: {
                        value: adultJournalState.vitalSigns[key].respiratoryRate,
                        onChange: (respiratoryRate: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                vitalSigns: {
                                    ...prev.vitalSigns,
                                    [key]: {
                                        ...prev.vitalSigns[key],
                                        respiratoryRate
                                    }
                                }
                            }))
                        }
                    },
                }
            })
            return tempInvestigations
        }
    }

    const onAdd = useCallback((dateKey: string) => {
        setAdultJournalState((prev: AdultJournalInformation) => ({
            ...prev,
            vitalSigns: {
                ...prev.vitalSigns,
                [dateKey]: defaultVitalSigns
            }
        }))
    }, [])

    const onDelete = useCallback((dateKey: string) => {
        setAdultJournalState((prev: AdultJournalInformation) => {
            const {[dateKey]: _, ...investigationsLeft} = prev.vitalSigns
            return {
                ...prev,
                vitalSigns: investigationsLeft
            }
        })
    }, [])

    const getSigns = useGetSigns()
    // console.log("Multiple, inves", investigations)
    return useMemo(() => ({
        onDelete,
        onAdd,
        signs: getSigns()
    }), [onAdd, getSigns, onDelete])
}

export function useCreateMultipleSleepScheduleHandler(): MultipleSleepScheduleHandler {
    const {babyJournalState, setBabyJournalState} = useContext(BabyJournalStateContext)
    let tempInvestigations: { [key: string]: SleepScheduleHandler } = {}
    const useGetSchedules = () => {
        return (): { [key: string]: SleepScheduleHandler } => {
            const keys = Object.keys(babyJournalState.sleepSchedule)
            tempInvestigations = {}
            keys.forEach((key: string) => {
                tempInvestigations[key] = {
                    daySleeping: {
                        value: babyJournalState.sleepSchedule[key].daySleeping,
                        onChange: (daySleeping: string) => {
                            setBabyJournalState((prev: BabyJournalInformation) => ({
                                ...prev,
                                sleepSchedule: {
                                    ...prev.sleepSchedule,
                                    [key]: {
                                        ...prev.sleepSchedule[key],
                                        daySleeping
                                    }
                                }
                            }))
                        }
                    },
                    nightSleeping: {
                        value: babyJournalState.sleepSchedule[key].nightSleeping,
                        onChange: (nightSleeping: string) => {
                            setBabyJournalState((prev: BabyJournalInformation) => ({
                                ...prev,
                                sleepSchedule: {
                                    ...prev.sleepSchedule,
                                    [key]: {
                                        ...prev.sleepSchedule[key],
                                        nightSleeping
                                    }
                                }
                            }))
                        }
                    },
                    waysOfSleeping: {
                        value: babyJournalState.sleepSchedule[key].waysOfSleeping,
                        onChange: (waysOfSleeping: string) => {
                            setBabyJournalState((prev: BabyJournalInformation) => ({
                                ...prev,
                                sleepSchedule: {
                                    ...prev.sleepSchedule,
                                    [key]: {
                                        ...prev.sleepSchedule[key],
                                        waysOfSleeping
                                    }
                                }
                            }))
                        }
                    },
                    nightSleepingProgress: {
                        value: babyJournalState.sleepSchedule[key].nightSleepingProgress,
                        onChange: (nightSleepingProgress: string) => {
                            setBabyJournalState((prev: BabyJournalInformation) => ({
                                ...prev,
                                sleepSchedule: {
                                    ...prev.sleepSchedule,
                                    [key]: {
                                        ...prev.sleepSchedule[key],
                                        nightSleepingProgress
                                    }
                                }
                            }))
                        }
                    },
                }
            })
            return tempInvestigations
        }
    }

    const onAdd = useCallback((dateKey: string) => {
        setBabyJournalState((prev: BabyJournalInformation) => ({
            ...prev,
            sleepSchedule: {
                ...prev.sleepSchedule,
                [dateKey]: defaultSleepSchedule
            }
        }))
    }, [])

    const onDelete = useCallback((dateKey: string) => {
        setBabyJournalState((prev: BabyJournalInformation) => {
            const {[dateKey]: _, ...investigationsLeft} = prev.sleepSchedule
            return {
                ...prev,
                sleepSchedule: investigationsLeft
            }
        })
    }, [])

    const getSchedules = useGetSchedules()
    // console.log("Multiple, inves", investigations)
    return useMemo(() => ({
        onDelete,
        onAdd,
        schedules: getSchedules()
    }), [onAdd, getSchedules, onDelete])
}

function useCreateMultipleConsultationHandler(): MultipleHandler<ConsultationHandler> {
    const {adultJournalState, setAdultJournalState} = useContext(AdultJournalStateContext)
    let tempInvestigations: { [key: string]: ConsultationHandler } = {}
    const useGetDates = () => {
        return (): { [key: string]: ConsultationHandler } => {
            const keys = Object.keys(adultJournalState.consultations)
            tempInvestigations = {}
            keys.forEach((key: string) => {
                tempInvestigations[key] = {
                    interdisciplinaryConsultation: {
                        value: adultJournalState.consultations[key].interdisciplinaryConsultation,
                        onChange: (interdisciplinaryConsultation: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                consultations: {
                                    ...prev.consultations,
                                    [key]: {
                                        ...prev.consultations[key],
                                        interdisciplinaryConsultation
                                    }
                                }
                            }))
                        }
                    },
                    recommendation: {
                        value: adultJournalState.consultations[key].recommendation,
                        onChange: (recommendation: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                consultations: {
                                    ...prev.consultations,
                                    [key]: {
                                        ...prev.consultations[key],
                                        recommendation
                                    }
                                }
                            }))
                        }
                    },
                }
            })
            return tempInvestigations
        }
    }

    const onAdd = useCallback((dateKey: string) => {
        setAdultJournalState((prev: AdultJournalInformation) => ({
            ...prev,
            consultations: {
                ...prev.consultations,
                [dateKey]: defaultConsultation
            }
        }))
    }, [])

    const onDelete = useCallback((dateKey: string) => {
        setAdultJournalState((prev: AdultJournalInformation) => {
            const {[dateKey]: _, ...investigationsLeft} = prev.consultations
            return {
                ...prev,
                consultations: investigationsLeft
            }
        })
    }, [])

    const getDates = useGetDates()
    // console.log("Multiple, inves", investigations)
    return useMemo(() => ({
        onDelete,
        onAdd,
        dates: getDates()
    }), [onAdd, getDates, onDelete])
}

function useCreateMultipleFollowUpHandler(): MultipleHandler<FollowUpHandler> {
    const {adultJournalState, setAdultJournalState} = useContext(AdultJournalStateContext)
    let tempInvestigations: { [key: string]: FollowUpHandler } = {}
    const useGetDates = () => {
        return (): { [key: string]: FollowUpHandler } => {
            const keys = Object.keys(adultJournalState.consultations)
            tempInvestigations = {}
            keys.forEach((key: string) => {
                tempInvestigations[key] = {
                    appointments: {
                        value: adultJournalState.followUp[key].appointments,
                        onChange: (appointments: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                followUp: {
                                    ...prev.followUp,
                                    [key]: {
                                        ...prev.followUp[key],
                                        appointments
                                    }
                                }
                            }))
                        }
                    },
                    monitoringProgress: {
                        value: adultJournalState.followUp[key].monitoringProgress,
                        onChange: (monitoringProgress: string) => {
                            setAdultJournalState((prev: AdultJournalInformation) => ({
                                ...prev,
                                followUp: {
                                    ...prev.followUp,
                                    [key]: {
                                        ...prev.followUp[key],
                                        monitoringProgress
                                    }
                                }
                            }))
                        }
                    },
                }
            })
            return tempInvestigations
        }
    }

    const onAdd = useCallback((dateKey: string) => {
        setAdultJournalState((prev: AdultJournalInformation) => ({
            ...prev,
            followUp: {
                ...prev.followUp,
                [dateKey]: defaultFollowUp
            }
        }))
    }, [])

    const onDelete = useCallback((dateKey: string) => {
        setAdultJournalState((prev: AdultJournalInformation) => {
            const {[dateKey]: _, ...investigationsLeft} = prev.followUp
            return {
                ...prev,
                followUp: investigationsLeft
            }
        })
    }, [])

    const getDates = useGetDates()
    // console.log("Multiple, inves", investigations)
    return useMemo(() => ({
        onDelete,
        onAdd,
        dates: getDates()
    }), [onAdd, getDates, onDelete])
}


function useCreateInvestigationHandler(field: keyof AdultJournalInformation): InvestigationHandler {
    const {adultJournalState, setAdultJournalState} = useContext(AdultJournalStateContext)

    return {
        description: {
            value: (adultJournalState[field] as unknown as Investigation).description,
            onChange: (description: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({
                    ...prev,
                    [field]: {...prev[field] as unknown as Investigation, description}
                }))
            }
        },
        assets: {
            value: (adultJournalState[field] as unknown as Investigation).assets,
            onChange: (assets: Asset[]) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({
                    ...prev,
                    [field]: {...prev[field] as unknown as Investigation, assets}
                }))
            }
        }
    }
}

function useAdultJournalInformation(): UseAdultJournalInformationValue {

    const [adultJournalState, setAdultJournalState] = useState<AdultJournalInformation>(defaultInformation)
    const [originalJournalState, setOriginalJournalState] = useState<AdultJournalInformation>(defaultInformation)
    const navigate = useNavigate()
    const {setIsLoading} = useContext(LoadingScreenContext)

    useEffect(() => {
            (async () => {
                setIsLoading(true)
                const auth = getAuth();
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                    } else {
                        // navigate('/app')
                    }
                });

                const urlParams = new URLSearchParams(window.location.search)
                const productId = urlParams.get('product_id')
                if (productId) {
                    const productRef = doc(db, DB_COLLECTIONS.ADULT_JOURNALS, productId)
                    const docSnap = await getDoc(productRef);
                    if (docSnap.exists()) {
                        setAdultJournalState((prev: AdultJournalInformation) => ({...prev, ...docSnap.data() as AdultJournalInformation}))
                        setOriginalJournalState((prev: AdultJournalInformation) => ({...prev, ...docSnap.data() as AdultJournalInformation}))
                        setIsLoading(false)
                    }
                }
            })()
            // notify(`Don't forget to save after changes`)
        }, []
    );
    return {originalJournalState, adultJournalState, setAdultJournalState, setOriginalJournalState}
}

function useAdultJournalEdit(): useAdultJournalEditInterface {
    const {adultJournalState, setAdultJournalState} = useContext(AdultJournalStateContext)
    return {
        profilePicture: {
            value: adultJournalState.profilePicture,
            onChange: (profilePicture: Asset[]) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, profilePicture}))
            }
        },
        name: {
            value: adultJournalState.name,
            onChange: (name: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, name}))
            }
        },
        birthDate: {
            value: adultJournalState.birthDate,
            onChange: (birthDate: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, birthDate}))
            }
        },
        gender: {
            value: adultJournalState.gender,
            onChange: (gender: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, gender}))
            }
        },
        personalIdNumber: {
            value: adultJournalState.personalIdNumber,
            onChange: (personalIdNumber: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, personalIdNumber}))
            }
        },
        address: {
            value: adultJournalState.address,
            onChange: (address: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, address}))
            }
        },
        phone: {
            value: adultJournalState.phone,
            onChange: (phone: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, phone}))
            }
        },
        medicalRecordNumber: {
            value: adultJournalState.medicalRecordNumber,
            onChange: (medicalRecordNumber: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, medicalRecordNumber}))
            }
        },
        previousConditions: {
            value: adultJournalState.previousConditions,
            onChange: (previousConditions: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, previousConditions}))
            }
        },
        medication: {
            value: adultJournalState.medication,
            onChange: (medication: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, medication}))
            }
        },
        allergies: {
            value: adultJournalState.allergies,
            onChange: (allergies: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, allergies}))
            }
        },
        familyHistory: {
            value: adultJournalState.familyHistory,
            onChange: (familyHistory: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, familyHistory}))
            }
        },
        vitalSigns: useCreateMultipleVitalSignHandler(),
        generalPhysicalExamination: {
            value: adultJournalState.generalPhysicalExamination,
            onChange: (generalPhysicalExamination: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, generalPhysicalExamination}))
            }
        },
        laboratoryTests: useCreateMultipleInvestigationsHandler("laboratoryTests"),
        bloodTests: useCreateMultipleInvestigationsHandler("bloodTests"),
        biochemistry: useCreateMultipleInvestigationsHandler("biochemistry"),
        inflammatoryMarkers: useCreateMultipleInvestigationsHandler("inflammatoryMarkers"),
        tumorMarkers: useCreateMultipleInvestigationsHandler("tumorMarkers"),
        hormonalProfiles: useCreateMultipleInvestigationsHandler("hormonalProfiles"),
        urineTests: useCreateMultipleInvestigationsHandler("urineTests"),
        stoolTests: useCreateMultipleInvestigationsHandler("stoolTests"),
        coagulationTests: useCreateMultipleInvestigationsHandler("coagulationTests"),
        INR: useCreateMultipleInvestigationsHandler("INR"),
        xRay: useCreateMultipleInvestigationsHandler("xRay"),
        ultrasound: useCreateMultipleInvestigationsHandler("ultrasound"),
        computedTomography: useCreateMultipleInvestigationsHandler("computedTomography"),
        magneticResonanceImaging: useCreateMultipleInvestigationsHandler("magneticResonanceImaging"),
        scintigraphy: useCreateMultipleInvestigationsHandler("scintigraphy"),
        upperDigestiveEndoscopy: useCreateMultipleInvestigationsHandler("upperDigestiveEndoscopy"),
        colonoscopy: useCreateMultipleInvestigationsHandler("colonoscopy"),
        bronchoscopy: useCreateMultipleInvestigationsHandler("bronchoscopy"),
        electrocardiogram: useCreateMultipleInvestigationsHandler("electrocardiogram"),
        echocardiography: useCreateMultipleInvestigationsHandler("echocardiography"),
        spirometry: useCreateMultipleInvestigationsHandler("spirometry"),
        stressTest: useCreateMultipleInvestigationsHandler("stressTest"),
        geneticTests: useCreateMultipleInvestigationsHandler("geneticTests"),
        pcrTests: useCreateMultipleInvestigationsHandler("pcrTests"),
        boneDensitometry: useCreateMultipleInvestigationsHandler("boneDensitometry"),
        // interdisciplinaryConsultations: {
        //     value: adultJournalState.interdisciplinaryConsultations,
        //     onChange: (interdisciplinaryConsultations: string) => {
        //         setAdultJournalState((prev: AdultJournalInformation) => ({...prev, interdisciplinaryConsultations}))
        //     }
        // },
        // recommendations: {
        //     value: adultJournalState.recommendations,
        //     onChange: (recommendations: string) => {
        //         setAdultJournalState((prev: AdultJournalInformation) => ({...prev, recommendations}))
        //     }
        // },
        consultations: useCreateMultipleConsultationHandler(),
        // primaryDiagnosis: {
        //     value: adultJournalState.primaryDiagnosis,
        //     onChange: (primaryDiagnosis: string) => {
        //         setAdultJournalState((prev: AdultJournalInformation) => ({...prev, primaryDiagnosis}))
        //     }
        // },
        // secondaryDiagnosis: {
        //     value: adultJournalState.secondaryDiagnosis,
        //     onChange: (secondaryDiagnosis: string) => {
        //         setAdultJournalState((prev: AdultJournalInformation) => ({...prev, secondaryDiagnosis}))
        //     }
        // },
        diagnoses: useCreateMultipleInvestigationsHandler("diagnoses"),
        medicationTreatment: useCreateMultipleInvestigationsHandler("medicationTreatment"),
        surgicalInterventions: useCreateMultipleInvestigationsHandler("surgicalInterventions"),
        lifestyleRecommendations: useCreateMultipleInvestigationsHandler("lifestyleRecommendations"),
        // appointments: {
        //     value: adultJournalState.appointments,
        //     onChange: (appointments: string) => {
        //         setAdultJournalState((prev: AdultJournalInformation) => ({...prev, appointments}))
        //     }
        // },
        // monitoringProgress: {
        //     value: adultJournalState.monitoringProgress,
        //     onChange: (monitoringProgress: string) => {
        //         setAdultJournalState((prev: AdultJournalInformation) => ({...prev, monitoringProgress}))
        //     }
        // },
        followUp: useCreateMultipleFollowUpHandler(),
        bloodType: {
            value: adultJournalState.bloodType,
            onChange: (bloodType: string) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, bloodType}))
            }
        },
        europeanHealthCard: {
            value: adultJournalState.europeanHealthCard,
            onChange: (europeanHealthCard: Asset[]) => {
                setAdultJournalState((prev: AdultJournalInformation) => ({...prev, europeanHealthCard}))
            }
        },
        testMultiple: useCreateMultipleInvestigationsHandler("testMultiple")
    }
}

export const AdultJournalEditContext = createContext<useAdultJournalEditInterface | null>(null)
export const AdultJournalStateContext = createContext<UseAdultJournalInformationValue>({
    originalJournalState: defaultInformation,
    adultJournalState: defaultInformation,
    setAdultJournalState: () => {
    },
    setOriginalJournalState: () => {

    }
})

export function AdultJournalStateContextProvider({children}: any) {
    const value = useAdultJournalInformation()
    if (!value) return null
    return <AdultJournalStateContext.Provider value={value}>
        {children}
    </AdultJournalStateContext.Provider>
}

export function AdultJournalEditContextProvider({children}: any) {
    const value = useAdultJournalEdit()
    if (!value) return null
    return <AdultJournalEditContext.Provider value={value}>
        {children}
    </AdultJournalEditContext.Provider>
}

export const ModificationJournalContext = createContext<{
    onWantsToExit: () => void,
    onCancelExit: () => void,
    modalOpen: boolean
}>({
    onWantsToExit: () => {
    },
    onCancelExit: () => {
    },
    modalOpen: false
})

export function ModificationJournalContextProvider({journalType, children}: {
    journalType: 'baby' | 'adult'
    children: any
}) {
    const [modalOpen, setModalOpen] = useState(false)
    const {originalJournalState, adultJournalState} = useContext(AdultJournalStateContext)
    const {originalBabyJournalState, babyJournalState} = useContext(BabyJournalStateContext)
    const [actualState, setActualState] = useState({})
    const [originalState, setOriginalState] = useState({})
    useEffect(() => {
        if (journalType === 'baby') {
            setActualState(babyJournalState)
            setOriginalState(originalBabyJournalState)
        } else {
            setActualState(adultJournalState)
            setOriginalState(originalJournalState)
        }
    }, [babyJournalState, originalJournalState, adultJournalState, originalBabyJournalState]);

    const navigate = useNavigate()
    const productID = getProductIdFromURL()
    const onWantsToExit = () => {
        if (JSON.stringify(originalState) === JSON.stringify(actualState)) {
            navigate(`/manage-device?product_id=${productID}`)
        } else {
            setModalOpen(true)
        }
    }

    const onCancelExit = () => {
        setModalOpen(false)
    }

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            // This will prompt the user with a confirmation dialog
            event.preventDefault();
            event.returnValue = ''; // Some browsers require this for the prompt to show

        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup the event listener on component unmount
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const value = {onWantsToExit, onCancelExit, modalOpen}

    return <ModificationJournalContext.Provider value={value}>
        {children}
    </ModificationJournalContext.Provider>
}
