import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {db} from "../App";
import {JOURNAL_SEGMENTS, JournalNavbar} from "./journal-navbar";
import {HomeJournalSegment} from "./home-journal-segment";
import dayjs, {Dayjs} from "dayjs";
import {HealthJournalSegment} from "./health-journal-segment";
import {notify} from "../Pages/login-page";
import {getProductIdFromURL} from "../utils";
import {SaveJournalButton} from "./save-journal-button";
import {LoadingScreen, LoadingScreenContext} from "./loading-sreen";
import {
    AdultJournalStateContext,
    defaultMultipleInvestigations,
    InvestigationHandler,
    ModificationJournalContextProvider,
    MultipleInvestigations,
    MultipleInvestigationsHandler,
    MultipleSleepScheduleHandler,
    useCreateMultipleSleepScheduleHandler
} from "./adult-journal-settings";
import {NotSavedScreen} from "./not-saved-screen";
import {useNavigate} from "react-router";

// import {InvestigationsJournalSegment} from "./investigations-journal-segment";

export enum DB_COLLECTIONS {
    PRODUCTS = 'products',
    SERIAL_NUMBERS = 'serial_numbers',
    BABY_JOURNALS = 'baby_journals',
    ADULT_JOURNALS = 'adult_journals',
    PERMISSIONS = 'permissions',
    ANIMAL_TAG = 'animal_tag',
    MAIL = 'mail'
}

export enum DB_STORAGE {
    BABY_JOURNAL = 'baby_journal',
    ADULT_JOURNAL = 'adult_journal',
    ANIMAL_TAG = 'animal_tag',
}

export interface Asset {
    name: string,
    url: string
}

interface Investigation {
    name: string,
    details: string,
    assets: Asset[]
}

export interface SleepSchedule {
    daySleeping: string,
    nightSleeping: string,
    waysOfSleeping: string,
    nightSleepingProgress: string,
}

export interface MultipleSleepSchedule {
    [key: string]: SleepSchedule
}

export interface BabyJournalInformation {
    name: string,
    gender: string,
    birthDate: string,
    timeOfBirth: string,
    apgar: string,
    weightOnBirth: string,
    heightOnBirth: string,
    placeOfBirth: string,
    biography: string,
    firstHeadHold: string,
    firstRoll: string,
    firstSit: string,
    firstSteps: string,
    firstRun: string,
    firstBreastfeeding: string,
    firstFormula: string,
    introductionOfCereal: string,
    firstSolidFeeding: string,
    foodPreferences: string,
    foodAversions: string,
    sleepSchedule: MultipleSleepSchedule
    // daySleeping: string,
    // nightSleeping: string,
    // waysOfSleeping: string,
    // nightSleepingProgress: string,
    mother: {
        profilePicture: Asset[]
        name: string,
        allergies: string,
        diseases: string,
        chronicAversions: string,
        bloodType: string
    },
    father: {
        profilePicture: Asset[]
        name: string,
        allergies: string,
        diseases: string,
        chronicAversions: string,
        bloodType: string
    },
    healthProblems: MultipleInvestigations,
    vaccines: MultipleInvestigations,
    allergies: MultipleInvestigations,
    medication: MultipleInvestigations,
    chronicAversions: MultipleInvestigations,
    otherHealthConditions: string,
    medicalRecords: Asset[],
    profilePicture: Asset[],
    bloodType: string,
    europeanHealthCard: Asset[],

    // investigations: Investigation[]
}

interface useBabyJournalEditInterface {
    name: EditContext<string>,
    gender: EditContext<string>,
    birthDate: EditContext<string>,
    timeOfBirth: EditContext<string>
    apgar: EditContext<string>,
    weightOnBirth: EditContext<string>,
    heightOnBirth: EditContext<string>,
    placeOfBirth: EditContext<string>,
    biography: EditContext<string>,
    firstHeadHold: EditContext<string>,
    firstRoll: EditContext<string>,
    firstSit: EditContext<string>,
    firstSteps: EditContext<string>,
    firstRun: EditContext<string>,
    firstBreastfeeding: EditContext<string>,
    firstFormula: EditContext<string>,
    introductionOfCereal: EditContext<string>,
    firstSolidFeeding: EditContext<string>,
    foodPreferences: EditContext<string>,
    foodAversions: EditContext<string>,
    // daySleeping: EditContext<string>,
    // nightSleeping: EditContext<string>,
    // waysOfSleeping: EditContext<string>,
    // nightSleepingProgress: EditContext<string>,
    sleepSchedule: MultipleSleepScheduleHandler
    // investigations: any,
    mother: {
        profilePicture: EditContext<Asset[]>
        name: EditContext<string>,
        allergies: EditContext<string>,
        diseases: EditContext<string>,
        chronicAversions: EditContext<string>,
        bloodType: EditContext<string>,
    },
    father: {
        profilePicture: EditContext<Asset[]>
        name: EditContext<string>,
        allergies: EditContext<string>,
        diseases: EditContext<string>,
        chronicAversions: EditContext<string>,
        bloodType: EditContext<string>
    },
    healthProblems: MultipleInvestigationsHandler,
    vaccines: MultipleInvestigationsHandler,
    allergies: MultipleInvestigationsHandler,
    medication: MultipleInvestigationsHandler,
    chronicAversions: MultipleInvestigationsHandler,
    otherHealthConditions: EditContext<string>,
    medicalRecords: EditContext<Asset[]>,
    profilePicture: EditContext<Asset[]>,
    bloodType: EditContext<string>,
    europeanHealthCard: EditContext<Asset[]>

}

export function BabyJournalSettings() {
    const [activeSegment, setActiveSegment] = useState<JOURNAL_SEGMENTS>(JOURNAL_SEGMENTS.HOME)
    const [isLoading, setIsLoading] = useState(false)
    return <div style={{position: "relative", maxWidth: "1000px", margin: "0 auto"}}>
        <LoadingScreenContext.Provider value={{isLoading, setIsLoading}}>
            <BabyJournalStateContextProvider>
                <BabyJournalEditContextProvider>
                    <ModificationJournalContextProvider journalType={'baby'}>
                        <JournalNavbar activeSegment={activeSegment} setActiveSegment={setActiveSegment} home health/>
                        {isLoading && <LoadingScreen/>}
                        {activeSegment === JOURNAL_SEGMENTS.HOME && <HomeJournalSegment/>}
                        {/*{activeSegment === JOURNAL_SEGMENTS.INVESTIGATIONS && <InvestigationsJournalSegment/>}*/}
                        {activeSegment === JOURNAL_SEGMENTS.HEALTH && <HealthJournalSegment/>}
                        <SaveJournalButton collection={DB_COLLECTIONS.BABY_JOURNALS}/>
                        <NotSavedScreen/>
                    </ModificationJournalContextProvider>
                </BabyJournalEditContextProvider>
            </BabyJournalStateContextProvider>
        </LoadingScreenContext.Provider>
    </div>
}

const defaultInvestigation: Investigation = {
    name: "",
    details: "",
    assets: []
}

const defaultInformation: BabyJournalInformation = {
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
    // daySleeping: "",
    // nightSleeping: "",
    // waysOfSleeping: "",
    // nightSleepingProgress: "",
    // investigations: [defaultInvestigation],
    mother: {
        profilePicture: [],
        name: "",
        allergies: "",
        diseases: "",
        chronicAversions: "",
        bloodType: ""
    },
    father: {
        profilePicture: [],
        name: "",
        allergies: "",
        diseases: "",
        chronicAversions: "",
        bloodType: ""
    },
    healthProblems: defaultMultipleInvestigations,
    vaccines: defaultMultipleInvestigations,
    allergies: defaultMultipleInvestigations,
    medication: defaultMultipleInvestigations,
    chronicAversions: defaultMultipleInvestigations,
    otherHealthConditions: "",
    medicalRecords: [],
    profilePicture: [],
    bloodType: "",
    europeanHealthCard: [],
}

interface useBabyJournalInformation {
    babyJournalState: BabyJournalInformation,
    setBabyJournalState: any,
    originalBabyJournalState: BabyJournalInformation,
    setOriginalBabyJournalState: any,
}

export function useBabyJournalInformation(): useBabyJournalInformation {

    const [babyJournalState, setBabyJournalState] = useState<BabyJournalInformation>(defaultInformation)
    const [originalBabyJournalState, setOriginalBabyJournalState] = useState<BabyJournalInformation>(defaultInformation)
    const navigate = useNavigate()
    const {setIsLoading} = useContext(LoadingScreenContext)

    useEffect(() => {
            (async () => {
                setIsLoading(true)
                const auth = getAuth();
                // onAuthStateChanged(auth, (user) => {
                //     if (user) {
                //     } else {
                //         navigate('/app')
                //     }
                // });

                const urlParams = new URLSearchParams(window.location.search)
                const productId = urlParams.get('product_id')
                if (productId) {
                    const productRef = doc(db, DB_COLLECTIONS.BABY_JOURNALS, productId)
                    const docSnap = await getDoc(productRef);
                    console.log(docSnap, docSnap.exists(), docSnap.data())
                    if (docSnap.exists()) {
                        setBabyJournalState((prev: BabyJournalInformation) => ({...prev, ...docSnap.data() as BabyJournalInformation}))
                        setIsLoading(false)
                        setOriginalBabyJournalState((prev: BabyJournalInformation) => ({...prev, ...docSnap.data() as BabyJournalInformation}))
                    }
                }
            })()
            // notify(`Don't forget to save after changes`)
        }, []
    );
    return {babyJournalState, setBabyJournalState, originalBabyJournalState, setOriginalBabyJournalState}
}

export interface EditContext<T> {
    value: T,
    onChange: (value: T) => void
}

function useCreateMultipleInvestigationsHandlerBaby(field: keyof BabyJournalInformation): MultipleInvestigationsHandler {
    const {babyJournalState, setBabyJournalState} = useContext(BabyJournalStateContext)
    let tempInvestigations: { [key: string]: InvestigationHandler } = {}
    const useGetInvestigations = () => {
        return (): { [key: string]: InvestigationHandler } => {
            const keys = Object.keys(babyJournalState[field])
            tempInvestigations = {}
            keys.forEach((key: string) => {
                tempInvestigations[key] = {
                    description: {
                        value: (babyJournalState[field] as MultipleInvestigations)[key].description,
                        onChange: (description: string) => {
                            setBabyJournalState((prev: BabyJournalInformation) => ({
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
                        value: (babyJournalState[field] as MultipleInvestigations)[key].assets,
                        onChange: (assets: Asset[]) => {
                            setBabyJournalState((prev: BabyJournalInformation) => ({
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
        setBabyJournalState((prev: BabyJournalInformation) => ({
            ...prev,
            [field]: {
                ...(prev[field] as MultipleInvestigations),
                [dateKey]: defaultInvestigation
            }
        }))
    }, [])

    const onDelete = useCallback((dateKey: string) => {
        setBabyJournalState((prev: BabyJournalInformation) => {
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

function useBabyJournalEdit(): useBabyJournalEditInterface {
    const {babyJournalState, setBabyJournalState} = useContext(BabyJournalStateContext)
    // const investigationsHandler = useGenerateInvestigationsHandler()

    return {
        name: {
            value: babyJournalState.name,
            onChange: (name: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, name}))
            }
        },
        gender: {
            value: babyJournalState.gender,
            onChange: (gender: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, gender}))
            }
        },
        birthDate: {
            value: babyJournalState.birthDate,
            onChange: (birthDate: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, birthDate}))
            }
        },
        timeOfBirth: {
            value: babyJournalState.timeOfBirth,
            onChange: (timeOfBirth: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, timeOfBirth}))
            }
        },
        apgar: {
            value: babyJournalState.apgar,
            onChange: (apgar: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, apgar}))
            }
        },
        weightOnBirth: {
            value: babyJournalState.weightOnBirth,
            onChange: (weightOnBirth: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, weightOnBirth}))
            }
        },
        heightOnBirth: {
            value: babyJournalState.heightOnBirth,
            onChange: (heightOnBirth: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, heightOnBirth}))
            }
        },
        placeOfBirth: {
            value: babyJournalState.placeOfBirth,
            onChange: (placeOfBirth: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, placeOfBirth}))
            }
        },
        biography: {
            value: babyJournalState.biography,
            onChange: (biography: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, biography}))
            }
        },
        firstHeadHold: {
            value: babyJournalState.firstHeadHold,
            onChange: (firstHeadHold: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstHeadHold}))
            }
        },
        firstRoll: {
            value: babyJournalState.firstRoll,
            onChange: (firstRoll: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstRoll}))
            }
        },
        firstSit: {
            value: babyJournalState.firstSit,
            onChange: (firstSit: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstSit}))
            }
        },
        firstSteps: {
            value: babyJournalState.firstSteps,
            onChange: (firstSteps: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstSteps}))
            }
        },
        firstRun: {
            value: babyJournalState.firstRun,
            onChange: (firstRun: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstRun}))
            }
        },
        firstBreastfeeding: {
            value: babyJournalState.firstBreastfeeding,
            onChange: (firstBreastfeeding: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstBreastfeeding}))
            }
        },
        firstFormula: {
            value: babyJournalState.firstFormula,
            onChange: (firstFormula: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstFormula}))
            }
        },
        introductionOfCereal: {
            value: babyJournalState.introductionOfCereal,
            onChange: (introductionOfCereal: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, introductionOfCereal}))
            }
        },
        firstSolidFeeding: {
            value: babyJournalState.firstSolidFeeding,
            onChange: (firstSolidFeeding: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstSolidFeeding}))
            }
        },
        foodPreferences: {
            value: babyJournalState.foodPreferences,
            onChange: (foodPreferences: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, foodPreferences}))
            }
        },
        foodAversions: {
            value: babyJournalState.foodAversions,
            onChange: (foodAversions: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, foodAversions}))
            }
        },
        sleepSchedule: useCreateMultipleSleepScheduleHandler(),
        // investigations: investigationsHandler,
        mother: {
            profilePicture: {
                value: babyJournalState.mother.profilePicture,
                onChange: (profilePicture: Asset[]) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, profilePicture}
                    }))
                }
            },
            name: {
                value: babyJournalState.mother.name,
                onChange: (name: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({...prev, mother: {...prev.mother, name}}))
                }
            },
            allergies: {
                value: babyJournalState.mother.allergies,
                onChange: (allergies: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, allergies}
                    }))
                }
            },
            diseases: {
                value: babyJournalState.mother.diseases,
                onChange: (diseases: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, diseases}
                    }))
                }
            },
            chronicAversions: {
                value: babyJournalState.mother.chronicAversions,
                onChange: (chronicAversions: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, chronicAversions}
                    }))
                }
            },
            bloodType: {
                value: babyJournalState.mother.bloodType,
                onChange: (bloodType: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, bloodType}
                    }))
                }
            }
        },
        father: {
            profilePicture: {
                value: babyJournalState.father.profilePicture,
                onChange: (profilePicture: Asset[]) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, profilePicture}
                    }))
                }
            },
            name: {
                value: babyJournalState.father.name,
                onChange: (name: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({...prev, father: {...prev.father, name}}))
                }
            },
            allergies: {
                value: babyJournalState.father.allergies,
                onChange: (allergies: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, allergies}
                    }))
                }
            },
            diseases: {
                value: babyJournalState.father.diseases,
                onChange: (diseases: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, diseases}
                    }))
                }
            },
            chronicAversions: {
                value: babyJournalState.father.chronicAversions,
                onChange: (chronicAversions: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, chronicAversions}
                    }))
                }
            },
            bloodType: {
                value: babyJournalState.father.bloodType,
                onChange: (bloodType: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, bloodType}
                    }))
                }
            }
        },
        healthProblems: useCreateMultipleInvestigationsHandlerBaby("healthProblems"),
        vaccines: useCreateMultipleInvestigationsHandlerBaby("vaccines"),
        allergies: useCreateMultipleInvestigationsHandlerBaby("allergies"),
        medication: useCreateMultipleInvestigationsHandlerBaby("medication"),
        chronicAversions: useCreateMultipleInvestigationsHandlerBaby("chronicAversions"),
        otherHealthConditions: {
            value: babyJournalState.otherHealthConditions,
            onChange: (otherHealthConditions: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, otherHealthConditions}))
            }
        },
        medicalRecords: {
            value: babyJournalState.medicalRecords,
            onChange: (medicalRecords: Asset[]) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, medicalRecords}))
            }
        },
        profilePicture: {
            value: babyJournalState.profilePicture,
            onChange: (profilePicture: Asset[]) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, profilePicture}))
            }
        },
        bloodType: {
            value: babyJournalState.bloodType,
            onChange: (bloodType: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, bloodType}))
            }
        },
        europeanHealthCard: {
            value: babyJournalState.europeanHealthCard,
            onChange: (europeanHealthCard: Asset[]) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, europeanHealthCard}))
            }
        },
    }
}

// function useGenerateInvestigationsHandler() {
//     const {babyJournalState, setBabyJournalState} = useBabyJournalInformation()
//     return babyJournalState.investigations.map((investigation, index) => {
//         return {
//             name: {
//                 value: investigation.name,
//                 onChange: (name: string) => {
//                     setBabyJournalState((prev: BabyJournalInformation) => {
//                         const tempInvestigations = prev.investigations
//                         tempInvestigations[index].name = name
//                         return tempInvestigations
//                     })
//                 }
//             },
//             details: {
//                 value: investigation.details,
//                 onChange: (details: string) => {
//                     setBabyJournalState((prev: BabyJournalInformation) => {
//                         const tempInvestigations = prev.investigations
//                         tempInvestigations[index].details = details
//                         return tempInvestigations
//                     })
//                 }
//             },
//         }
//     })
//
// }

export const BabyJournalEditContext = createContext<useBabyJournalEditInterface | null>(null)
export const BabyJournalStateContext = createContext<useBabyJournalInformation>({
    babyJournalState: defaultInformation,
    setBabyJournalState: () => {
    },
    originalBabyJournalState: defaultInformation,
    setOriginalBabyJournalState: () => {
    },
})

export function BabyJournalStateContextProvider({children}: any) {
    const value = useBabyJournalInformation()
    if (!value) return null
    return <BabyJournalStateContext.Provider value={value}>
        {children}
    </BabyJournalStateContext.Provider>
}

export function BabyJournalEditContextProvider({children}: any) {
    const value = useBabyJournalEdit()
    if (!value) return null
    return <BabyJournalEditContext.Provider value={value}>
        {children}
    </BabyJournalEditContext.Provider>
}