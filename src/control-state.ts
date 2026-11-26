import {useContext, useEffect, useState} from "react";
import {ManageProductContext} from "./contexts";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {notify} from "./Pages/login-page";
import {useNavigate} from "react-router";
import {getProduct} from "./firestore/repositories/products";
import {defaultProduct, Product} from "./firestore/schema/products";
import {Languages} from "./languages";

export {defaultProduct};
export type {Product};


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
                const product = await getProduct(productId);
                if (product) {
                    setProductState((prev: Product) => ({...prev, ...product}))
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
