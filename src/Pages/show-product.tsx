import {useNavigate} from "react-router";
import {CSSProperties, useContext, useEffect, useState} from "react";
import {doc, getDoc} from "firebase/firestore";
import {MainContext} from "../contexts";
import {getDownloadURL, ref} from "firebase/storage";
import {storage} from "../App";
import {Preview} from "../preview";
import './show-product.css'
import {defaultProduct, Product} from "../control-state";
import {TextField} from "@mui/material";
import {BabyJournalPreview} from "../components/baby-journal-preview";
import {AdultJournalPreview} from "../components/adult-journal-preview";
import { AnimalTagPreviewWrapper} from "./animal-tag/animal-tag-preview";
import {
    getPublicRoutingMode,
    getVisibleSections,
    PUBLIC_SECTION_ORDER,
} from "../product-visibility";
import {BusinessCardPublicPage} from "../components/business-card-public";
import {CustomLinkPublicPage} from "../components/custom-link-public";
import {UploadFilesPublicPage} from "../components/upload-files-public";
import {UploadSongsPublicPage} from "../components/upload-songs-public";
import {UploadVideoPublicPage} from "../components/upload-video-public";

export function ShowProduct() {
    const navigate = useNavigate()
    const [product, setProduct] = useState<Product>(defaultProduct)
    const urlParams = new URLSearchParams(window.location.search)
    const productId = urlParams.get('product_id')
    const {db} = useContext(MainContext)
    const [profileImageURL, setProfileImageURL] = useState('')
    const [logoImageURL, setLogoImageURL] = useState('')

    const [passwordProtected, setPasswordProtected] = useState(false)
    const [password, setPassword] = useState('')
    const [loaded, setLoaded] = useState(false)
    useEffect(() => {
        (async () => {
            if (productId) {
                const productRef = doc(db, 'products', productId)
                const docSnap = await getDoc(productRef);
                if (docSnap.exists()) {
                    console.log("it exists")
                    if (!docSnap.data().activated) {
                        navigate('/app?product_id=' + productId)
                    }
                    console.log("is activated")
                    setProduct((prev: Product) => ({...prev, ...docSnap.data() as Product}))
                    setPasswordProtected((docSnap.data() as Product).publicPagePasswordActivated)
                    setLoaded(true)
                } else {
                    // navigate('/app')
                }
                const imageRef = ref(storage, `images/${productId}`)
                getDownloadURL(imageRef)
                    .then(url => {
                        setProfileImageURL(url)
                        return Promise.resolve(true);
                    })
                    .catch(error => {
                        if (error.code === 'storage/object-not-found') {
                            return Promise.resolve(false);
                        } else {
                            return Promise.reject(error);
                        }
                    });
                const logoRef = ref(storage, `images/logo-${productId}`)
                getDownloadURL(logoRef)
                    .then(url => {
                        setLogoImageURL(url)
                        return Promise.resolve(true);
                    })
                    .catch(error => {
                        if (error.code === 'storage/object-not-found') {
                            return Promise.resolve(false);
                        } else {
                            return Promise.reject(error);
                        }
                    });


            }
        })()
    }, [])

    const downloadCV = () => {
        const documentRef = ref(storage, `documents/${productId}/CV` )
        getDownloadURL(documentRef)
            .then(url => {
                console.log(url);
                // This can be downloaded directly:
                const xhr = new XMLHttpRequest();
                xhr.responseType = 'blob';
                xhr.onload = function () {
                    const blob = xhr.response;
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${product.businessFile}`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                };
                xhr.open('GET', url);
                xhr.send();
                return Promise.resolve(true);
            })
            .catch(error => {
                if (error.code === 'storage/object-not-found') {
                    return Promise.resolve(false);
                } else {
                    return Promise.reject(error);
                }
            });
    }

    console.log('product, product', product)
    console.log(product.color1, product.color2)

    const colorsStyle = {
        "--color1": product.color1 || '#467083',
        "--color2": product.color2 || "#A3B0B5",
    } as CSSProperties;
    const visibleSections = loaded ? getVisibleSections(product) : [];
    const publicRoutingMode = getPublicRoutingMode(visibleSections);
    const requestedSection = urlParams.get('section') as Preview | null;
    const opensSectionFromDashboard = publicRoutingMode === 'dashboard' && Boolean(requestedSection && visibleSections.includes(requestedSection));
    const activePreview = opensSectionFromDashboard
        ? requestedSection
        : publicRoutingMode === 'single' ? visibleSections[0] : product.preview;
    const showSectionDashboard = publicRoutingMode === 'dashboard' && !opensSectionFromDashboard;

    return (<div style={colorsStyle}>
        {passwordProtected && <div className={'password-page'}>
            <TextField label={'Unlock page'} type={'password'} className={'form-manager-input'} value={password}
                       onChange={(e) => {
                           setPassword(e.target.value)
                           if (e.target.value === product.publicPagePassword) {
                               setPasswordProtected(false)
                           }
                       }} variant={"outlined"} size={"small"}/>
        </div>}
        {loaded && !passwordProtected && publicRoutingMode === 'empty' && <PublicNotConfigured/>}
        {loaded && !passwordProtected && showSectionDashboard && (
            <PublicSectionDashboard
                product={product}
                sections={visibleSections}
                productId={productId || ''}
            />
        )}
        {loaded && !passwordProtected && !showSectionDashboard && activePreview === Preview.BUSINESS_CARD &&
            <BusinessCardPublicPage
                product={product}
                productId={productId || ""}
                profileImageURL={profileImageURL}
                logoImageURL={logoImageURL}
                onDownloadCV={downloadCV}
            />}
        {loaded && !passwordProtected && !showSectionDashboard && activePreview === Preview.CUSTOM_LINK &&
            <CustomLinkPublicPage
                product={product}
                productId={productId || ""}
                fromDashboard={opensSectionFromDashboard}
            />}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.UPLOAD_FILE &&
            <UploadFilesPublicPage product={product} productId={productId || ""}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.UPLOAD_VIDEO &&
            <UploadVideoPublicPage product={product} productId={productId || ""} fromDashboard={opensSectionFromDashboard}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.UPLOAD_SONGS &&
            <UploadSongsPublicPage product={product} productId={productId || ""}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.BABY_JOURNAL &&
            <BabyJournalPreview product={product} productId={productId || ""} fromDashboard={opensSectionFromDashboard}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.ADULT_JOURNAL && <AdultJournalPreview/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.ANIMAL_TAG && <AnimalTagPreviewWrapper/>}

    </div>)

}

function PublicNotConfigured() {
    return (
        <div className="public-routing-state">
            <div className="public-routing-card">
                <p>FLEXPAYZ</p>
                <h1>This device is not configured.</h1>
                <span>No public sections are visible yet.</span>
            </div>
        </div>
    );
}

function PublicSectionDashboard({product, sections, productId}: { product: Product; sections: Preview[]; productId: string }) {
    const visibleDefinitions = PUBLIC_SECTION_ORDER.filter((section) => sections.includes(section.id));

    return (
        <div className="public-routing-state">
            <div className="public-routing-card public-routing-dashboard">
                <p>FLEXPAYZ</p>
                <h1>{product.name || 'FlexPayz product'}</h1>
                <span>Choose what you want to open.</span>
                <div className="public-routing-section-list">
                    {visibleDefinitions.map((section) => (
                        <a
                            key={section.id}
                            href={`/show-product?product_id=${encodeURIComponent(productId)}&section=${encodeURIComponent(section.id)}`}
                            className="public-routing-section"
                        >
                            <strong>{section.title}</strong>
                            <small>{section.description}</small>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
