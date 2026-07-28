import {Preview} from "./preview";
import {useContext, useEffect, useState} from "react";
import {ManageProductContext} from "./contexts";
import {Languages} from "./languages";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {doc, getDoc} from "firebase/firestore";
import {db} from "./App";
import {notify} from "./Pages/login-page";
import {useNavigate} from "react-router";

export const defaultProduct: Product = {
    name: '',
    activated: true,
    preview: Preview.BUSINESS_CARD,
    unlockCode: '',
    firstName: '',
    lastName: '',
    title: '',
    email: '',
    email2: '',
    email3: '',
    phoneNumber: '',
    phoneNumber2: '',
    phoneNumber3: '',
    country: '',
    address: '',
    address2: '',
    zipCode: '',
    city: '',
    linkedIn: '',
    instagram: '',
    facebook: '',
    youtube: '',
    tiktok: '',
    about: '',
    companyName: '',
    companyRegNumber: '',
    companyAddress: '',
    companyCity: '',
    companyCountry: '',
    companyPhoneNumber: '',
    companyAbout: '',
    customLink: '',
    filename1: '',
    filename2: '',
    filename3: '',
    cv: false,
    website: '',
    website2: '',
    youtubeLink: '',
    publicPagePassword: '',
    publicPagePasswordActivated: false,
    color1: '#467083',
    color2: '#A3B0B5',
    logo: '',
    song1: '',
    song2: '',
    song3: '',
    businessFile: '',
    sharedContacts: [],
    previewLanguage: Languages.ENGLISH,
    visibleSections: undefined
}

export interface Product {
    name: string
    activated: boolean,
    preview: Preview
    visibleSections?: Preview[]
    unlockCode: string,
    firstName: string,
    lastName: string,
    title: string,
    email: string,
    email2: string,
    email3: string,
    phoneNumber: string,
    phoneNumber2: string
    phoneNumber3: string
    country: string,
    address: string,
    address2: string,
    zipCode: string,
    city: string,
    linkedIn: string,
    instagram: string,
    facebook: string,
    youtube: string,
    tiktok: string,
    about: string
    companyName: string,
    companyRegNumber: string,
    companyAddress: string,
    companyCity: string,
    companyCountry: string,
    companyPhoneNumber: string,
    companyAbout: string,
    customLink: string,
    filename1: string,
    filename2: string,
    filename3: string,
    cv: boolean,
    website: string,
    website2: string,
    youtubeLink: string
    publicPagePassword: string,
    publicPagePasswordActivated: boolean,
    color1: string,
    color2: string,
    logo: string,
    song1: string,
    song2: string,
    song3: string,
    businessFile: string,
    sharedContacts: any[],
    previewLanguage: Languages

}


export const useProductInformation = () => {
    const [productState, setProductState] = useState<Product>(defaultProduct)
    const [invalidFields, setInvalidFields] = useState(new Map<string, string>)
    const navigate = useNavigate()
    useEffect(() => {

        (async () => {
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
                const productRef = doc(db, 'products', productId)
                const docSnap = await getDoc(productRef);
                if (docSnap.exists()) {
                    setProductState((prev: Product) => ({...prev, ...docSnap.data() as Product}))

                }
            }
        })()

        // notify(`Don't forget to save after changes`)
    }, []);
    // console.log({productState, setProductState})
    return {productState, setProductState, invalidFields}
}
export const useEditState = () => {
    const {productState: state, setProductState: setState, invalidFields} = useContext(ManageProductContext)
    return {
        name: {
            value: state.name,
            onChange: (name: string) => {
                setState((prev: Product) => ({...prev, name}))
            }
        },
        firstName: {
            value: state.firstName,
            onChange: (firstName: string) => {
                setState((prev: Product) => ({...prev, firstName}))
            }
        },
        lastName: {
            value: state.lastName,
            onChange: (lastName: string) => {
                setState((prev: Product) => ({...prev, lastName}))
            }
        },
        title: {
            value: state.title,
            onChange: (title: string) => {
                setState((prev: Product) => ({...prev, title}))
            }
        },
        address: {
            value: state.address,
            onChange: (address: string) => {
                setState((prev: Product) => ({...prev, address}))
            }
        },
        email: {
            value: state.email,
            onChange: (email: string) => {
                setState((prev: Product) => ({...prev, email}))
            }
        },
        email2: {
            value: state.email2,
            onChange: (email2: string) => {
                setState((prev: Product) => ({...prev, email2}))
            }
        },
        email3: {
            value: state.email3,
            onChange: (email3: string) => {
                setState((prev: Product) => ({...prev, email3}))
            }
        },
        phoneNumber: {
            value: state.phoneNumber,
            onChange: (phoneNumber: string) => {
                setState((prev: Product) => ({...prev, phoneNumber}))
            }
        },
        phoneNumber2: {
            value: state.phoneNumber2,
            onChange: (phoneNumber2: string) => {
                setState((prev: Product) => ({...prev, phoneNumber2}))
            }
        },
        phoneNumber3: {
            value: state.phoneNumber3,
            onChange: (phoneNumber3: string) => {
                setState((prev: Product) => ({...prev, phoneNumber3}))
            }
        },
        country: {
            value: state.country,
            onChange: (country: string) => {
                setState((prev: Product) => ({...prev, country}))
            }
        },
        address2: {
            value: state.address2,
            onChange: (address2: string) => {
                setState((prev: Product) => ({...prev, address2}))
            }
        },
        zipCode: {
            value: state.zipCode,
            onChange: (zipCode: string) => {
                setState((prev: Product) => ({...prev, zipCode}))
            }
        },
        city: {
            value: state.city,
            onChange: (city: string) => {
                setState((prev: Product) => ({...prev, city}))
            }
        },
        linkedIn: {
            value: state.linkedIn,
            onChange: (linkedIn: string) => {
                setState((prev: Product) => ({...prev, linkedIn}))
            }
        },
        instagram: {
            value: state.instagram,
            onChange: (instagram: string) => {
                setState((prev: Product) => ({...prev, instagram}))
            }
        },
        facebook: {
            value: state.facebook,
            onChange: (facebook: string) => {
                setState((prev: Product) => ({...prev, facebook}))
            }
        },
        tiktok: {
            value: state.tiktok,
            onChange: (tiktok: string) => {
                setState((prev: Product) => ({...prev, tiktok}))
            }
        },
        youtube: {
            value: state.youtube,
            onChange: (youtube: string) => {
                setState((prev: Product) => ({...prev, youtube}))
            }
        },
        about: {
            value: state.about,
            onChange: (about: string) => {
                setState((prev: Product) => ({...prev, about}))
            }
        },
        companyName: {
            value: state.companyName,
            onChange: (companyName: string) => {
                setState((prev: Product) => ({...prev, companyName}))
            }
        },
        companyRegNumber: {
            value: state.companyRegNumber,
            onChange: (companyRegNumber: string) => {
                setState((prev: Product) => ({...prev, companyRegNumber}))
            }
        },
        companyAddress: {
            value: state.companyAddress,
            onChange: (companyAddress: string) => {
                setState((prev: Product) => ({...prev, companyAddress}))
            }
        },
        companyCity: {
            value: state.companyCity,
            onChange: (companyCity: string) => {
                setState((prev: Product) => ({...prev, companyCity}))
            }
        },
        companyCountry: {
            value: state.companyCountry,
            onChange: (companyCountry: string) => {
                setState((prev: Product) => ({...prev, companyCountry}))
            }
        },
        companyPhoneNumber: {
            value: state.companyPhoneNumber,
            onChange: (companyPhoneNumber: string) => {
                setState((prev: Product) => ({...prev, companyPhoneNumber}))
            }
        },
        companyAbout: {
            value: state.companyAbout,
            onChange: (companyAbout: string) => {
                setState((prev: Product) => ({...prev, companyAbout}))
            }
        },

        customLink: {
            value: state.customLink,
            onChange: (customLink: string) => {
                setState((prev: Product) => ({...prev, customLink}))
            }
        },
        filename1: {
            value: state.filename1,
            onChange: (filename1: string) => {
                setState((prev: Product) => ({...prev, filename1}))
            }
        },
        filename2: {
            value: state.filename2,
            onChange: (filename2: string) => {
                setState((prev: Product) => ({...prev, filename2}))
            }
        },
        filename3: {
            value: state.filename3,
            onChange: (filename3: string) => {
                setState((prev: Product) => ({...prev, filename3}))
            }
        },
        website: {
            value: state.website,
            onChange: (website: string) => {
                setState((prev: Product) => ({...prev, website}))
            }
        },
        website2: {
            value: state.website2,
            onChange: (website2: string) => {
                setState((prev: Product) => ({...prev, website2}))
            }
        },
        youtubeLink: {
            value: state?.youtubeLink,
            onChange: (youtubeLink: string) => {
                setState((prev: Product) => ({...prev, youtubeLink}))
            }
        },
        publicPagePassword: {
            value: state?.publicPagePassword,
            onChange: (publicPagePassword: string) => {
                setState((prev: Product) => ({...prev, publicPagePassword}))
            }
        },
        color1: {
            value: state?.color1,
            onChange: (color1: string) => {
                setState((prev: Product) => ({...prev, color1}))
            }
        },
        color2: {
            value: state?.color2,
            onChange: (color2: string) => {
                setState((prev: Product) => ({...prev, color2}))
            }
        },
        song1: {
            value: state?.song1,
            onChange: (song1: string) => {
                setState((prev: Product) => ({...prev, song1}))
            }
        },
        song2: {
            value: state?.song2,
            onChange: (song2: string) => {
                setState((prev: Product) => ({...prev, song2}))
            }
        },
        song3: {
            value: state?.song3,
            onChange: (song3: string) => {
                setState((prev: Product) => ({...prev, song3}))
            }
        },
        businessFile: {
            value: state?.businessFile,
            onChange: (businessFile: string) => {
                setState((prev: Product) => ({...prev, businessFile}))
            }
        },
        previewLanguage: {
            value: state?.previewLanguage,
            onChange: (previewLanguage: Languages) => {
                setState((prev: Product) => ({...prev, previewLanguage}))
            }
        }


    }
}
