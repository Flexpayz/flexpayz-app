import VCard from "vcard-creator";
import {doc, updateDoc} from "firebase/firestore";
import {notify} from "./Pages/login-page";
import {getDownloadURL, ref, uploadBytes, deleteObject} from "firebase/storage";
import {db, storage} from "./App";
import {useContext, useState} from "react";
import {ManageProductContext} from "./contexts";
import {getProductIdFromURL} from "./utils";
import {defaultProduct, Product} from "./control-state";
import {Preview} from "./preview";
import {buildBusinessVCard, serializeBusinessCardUpdate} from "./business-card";


export function useResetDevice() {
    const {productState, setProductState} = useContext(ManageProductContext)
    const productId = getProductIdFromURL()
    const newProduct: Product = {
        ...defaultProduct,
        name: productState.name,
        activated: productState.activated,
        unlockCode: productState.unlockCode,
        visibleSections: [Preview.BUSINESS_CARD],
    }

    const vCardRef = ref(storage, `documents/${productId}/vCard`)
    const logoRef = ref(storage, `images/logo-${productId}`)
    const file1Ref = ref(storage, `documents/${productId}/file1`)
    const file2Ref = ref(storage, `documents/${productId}/file2`)
    const file3Ref = ref(storage, `documents/${productId}/file3`)
    const cvRef = ref(storage, `documents/${productId}/CV`)
    const imageRef = ref(storage, `images/${productId}`)



return async () =>{
    if (productId) {
        const productRef = doc(db, 'products', productId)
        await updateDoc(productRef,  {...newProduct})
        await Promise.allSettled([vCardRef, logoRef, file1Ref, file2Ref, file3Ref, cvRef, imageRef].map((ref) =>  deleteObject(ref)))
        setProductState?.(newProduct)
        notify('Device has been restored to default')
    }
}
}

export function useSaveName() {
    const {productState, setProductState} = useContext(ManageProductContext)
    const productId = getProductIdFromURL()
    return async () => {
        if (productId) {
            const productRef = doc(db, 'products', productId)
            await updateDoc(productRef, {name: productState.name})
            notify('Saved device name')
        }

    }

}
export function useSaveProductData () {
    const {productState, setProductState} = useContext(ManageProductContext)
    console.log('save, business', productState.businessFile
    )
    const urlParams = new URLSearchParams(window.location.search)
    const productId = urlParams.get('product_id')
    const logoRef = ref(storage, `images/logo-${productId}`)
    const [logoURL, setLogoURL] = useState('')
    getDownloadURL(logoRef)
        .then(url => {
            setLogoURL(url)
            return Promise.resolve(true);
        })
        .catch(error => {
            if (error.code === 'storage/object-not-found') {
                return Promise.resolve(false);
            } else {
                return Promise.reject(error);
            }
        });
    return async () => {
        const myVCard = new VCard()
        myVCard.addName(productState.lastName, productState.firstName)
        myVCard.addAddress(productState.address)
        myVCard.addCompany(productState.companyName)
        myVCard.addEmail(productState.email)
        myVCard.addJobtitle(productState.title)
        myVCard.addPhoneNumber(productState.phoneNumber)
        myVCard.addNote(productState.companyAbout)
        if (productState.website2) {
            myVCard.addURL(productState.website2, 'Website 2')
        }

        if (productState.email2) {
            myVCard.addEmail(productState.email2, 'Email 2')
        }
        if (productState.email3) {
            myVCard.addEmail(productState.email3, 'Email 3')
        }
        if (productState.phoneNumber2) {
            myVCard.addPhoneNumber(productState.phoneNumber2, 'Phone 2')
        }

        if (productState.phoneNumber3) {
            myVCard.addPhoneNumber(productState.phoneNumber3, 'Phone 3')
        }

        if (productState.youtube) {
            myVCard.addSocial(productState.youtube, 'Youtube')
        }
        if (productState.tiktok) {
            myVCard.addSocial(productState.tiktok, 'Tik Tok')
        }
        if (productState.linkedIn) {
            myVCard.addSocial(productState.linkedIn, 'linkedIn')
        }
        if (productState.facebook) {
            myVCard.addSocial(productState.facebook, 'facebook')
        }

        if (productState.instagram) {
            myVCard.addSocial(productState.instagram, 'Instagram')
        }
        if (logoURL) {
            myVCard.addLogoURL(logoURL)
        }
        console.log('logo', logoURL)
        console.log('vCard', myVCard.toString())
        const blob = new Blob([myVCard.toString()], {type: "text/vcard"})
        const file = new File([blob], 'vCard.vcf', {type: "text/vcard"})


        if (productId) {
            const productRef = doc(db, 'products', productId)
            await updateDoc(productRef, {...productState, activated: true})
            notify('Saved modifications')
        }
        const tempDoc = file
        console.log(tempDoc)
        if (tempDoc !== null) {
            const documentRef = ref(storage, `documents/${productId}/vCard`)
            console.log('start')
            uploadBytes(documentRef, tempDoc).then((data) => {
                console.log(data)
                // setProductState((prev: Product) => ({...prev, cv: true}))
            })
            console.log('document uploaded')
        }
    }
}

export function useSaveBusinessCardData() {
    const {productState} = useContext(ManageProductContext);
    const productId = getProductIdFromURL();

    return async () => {
        if (!productId) return;

        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, serializeBusinessCardUpdate(productState));

        const logoRef = ref(storage, `images/logo-${productId}`);
        let logoURL = '';
        try {
            logoURL = await getDownloadURL(logoRef);
        } catch (error: any) {
            if (error?.code !== 'storage/object-not-found') {
                throw error;
            }
        }

        const blob = new Blob([buildBusinessVCard(productState, logoURL)], {type: "text/vcard"});
        const file = new File([blob], 'vCard.vcf', {type: "text/vcard"});
        const documentRef = ref(storage, `documents/${productId}/vCard`);
        await uploadBytes(documentRef, file);
    };
}
