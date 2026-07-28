import {getDownloadURL, ref, uploadBytes} from "firebase/storage";
import {db, storage} from "./App";
import {Product, useProductInformation} from "./control-state";
import {useContext} from "react";
import {ManageProductContext} from "./contexts";
import {Preview} from "./preview";
import {doc, updateDoc} from "firebase/firestore";
import {notify} from "./Pages/login-page";

export const onChangeWrapper = (key: any) => {
    return (e: any) => {
        e.preventDefault()
        key.onChange(e.target.value)
    }
}

export function useUploadFile(filename: string, fileID?: keyof Product, setFileUploaded?: any) {
    const productId = getProductIdFromURL()
    const {setProductState} = useContext(ManageProductContext)

    return async (e: any) => {
        const tempDoc = e.target.files[0]
        if (tempDoc !== null) {
            const documentRef = ref(storage, `documents/${productId}/${filename}`)
            console.log('start')
            uploadBytes(documentRef, tempDoc).then((data) => {
                setFileUploaded(true)
                if (fileID) {
                    setProductState((prev: Product) => ({...prev, [fileID]: true}))
                }
            })
            console.log('document uploaded')
        }
    }
}

export function useSaveLanguage() {
    const productId = getProductIdFromURL()
    // const {setProductState} = useContext(ManageProductContext)
    const {setProductState} = useContext(ManageProductContext)
    return async (e: any) => {
        setProductState((prev: Product) => ({...prev, previewLanguage: e.target.value}))
        if (productId) {
            const productRef = doc(db, 'products', productId)
            await updateDoc(productRef, {previewLanguage: e.target.value})
            notify('Changed the preview language.')
        }
    }
}

export function useUploadAudio(filename: string, fileID?: keyof Product) {
    const productId = getProductIdFromURL()
    const {setProductState} = useProductInformation()

    return async (e: any) => {
        const tempDoc = e.target.files[0]
        if (tempDoc !== null) {
            const documentRef = ref(storage, `audio/${productId}/${filename}`)
            console.log('start')
            uploadBytes(documentRef, tempDoc).then((data) => {
                console.log(data)
                if (fileID) {
                    setProductState((prev: Product) => ({...prev, [fileID]: true}))
                }
            })
            console.log('document uploaded')
        }
    }
}

export function useUploadLogo() {
    const productId = getProductIdFromURL()
    const {setProductState} = useContext(ManageProductContext)

    return async (e: any) => {
        const tempDoc = e.target.files[0]
        if (tempDoc !== null) {
            const documentRef = ref(storage, `images/logo-${productId}`)
            console.log('start')
            uploadBytes(documentRef, tempDoc).then((data) => {
                console.log(data)
                getDownloadURL(documentRef).then((url) => {
                setProductState((prev: Product) => ({...prev, logo: url}))
                })
            })
            console.log('document uploaded')
        }
    }
}

export function useSetPreview(preview: Preview) {
    const {setProductState} = useContext(ManageProductContext)
    const productId = getProductIdFromURL()

    return async () => {
        setProductState((prev: Product) => ({...prev, preview: preview}))
        if (productId) {
            const productRef = doc(db, 'products', productId)
            await updateDoc(productRef, {preview: preview})
            notify('Changed the public page.')
        }
    }
}


export const getProductIdFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const productId = urlParams.get('product_id')
    return productId
}
