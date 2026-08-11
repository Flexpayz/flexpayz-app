import {useNavigate} from "react-router";
import {CSSProperties, useEffect, useState} from "react";
import ChildCareRoundedIcon from "@mui/icons-material/ChildCareRounded";
import ContactPageRoundedIcon from "@mui/icons-material/ContactPageRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PetsRoundedIcon from "@mui/icons-material/PetsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
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
import {BackButton, FlexPayzLogo, LoadingPanel} from "../components/design-system";
import {PublicLanguageProvider, TranslatePublicCopy, usePublicLanguage, withPublicLanguageParam} from "../public-i18n";
import {PublicLanguagePicker} from "../components/public-page-header";
import {getProduct} from "../firestore/repositories/products";

export function ShowProduct() {
    const navigate = useNavigate()
    const [product, setProduct] = useState<Product>(defaultProduct)
    const urlParams = new URLSearchParams(window.location.search)
    const productId = urlParams.get('product_id')
    const [profileImageURL, setProfileImageURL] = useState('')
    const [logoImageURL, setLogoImageURL] = useState('')

    const [passwordProtected, setPasswordProtected] = useState(false)
    const [password, setPassword] = useState('')
    const [loaded, setLoaded] = useState(false)
    useEffect(() => {
        (async () => {
            if (productId) {
                const productData = await getProduct(productId);
                if (productData) {
                    if (!productData.activated) {
                        navigate('/app?product_id=' + productId)
                    }
                    setProduct((prev: Product) => ({...prev, ...productData}))
                    if (productData.inactive) {
                        setPasswordProtected(false);
                        setLoaded(true);
                        return;
                    }
                    setPasswordProtected(productData.publicPagePasswordActivated)
                } else {
                    setLoaded(true)
                    // navigate('/app')
                    return;
                }
                const imageRef = ref(storage, `images/${productId}`)
                const logoRef = ref(storage, `images/logo-${productId}`)
                const [profileUrl, logoUrl] = await Promise.all([
                    getDownloadURL(imageRef).catch(error => {
                        if (error.code === 'storage/object-not-found') {
                            return "";
                        }
                        return "";
                    }),
                    getDownloadURL(logoRef).catch(error => {
                        if (error.code === 'storage/object-not-found') {
                            return "";
                        }
                        return "";
                    }),
                ]);
                setProfileImageURL(profileUrl)
                setLogoImageURL(logoUrl)
                setLoaded(true)
            } else {
                setLoaded(true)
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

    const colorsStyle = {
        "--color1": product.color1 || '#467083',
        "--color2": product.color2 || "#A3B0B5",
    } as CSSProperties;
    const visibleSections = loaded ? getVisibleSections(product) : [];
    const publicRoutingMode = getPublicRoutingMode(visibleSections);
    const requestedSection = urlParams.get('section') as Preview | null;
    const opensSectionFromDashboard = publicRoutingMode === 'dashboard' && Boolean(requestedSection && visibleSections.includes(requestedSection));
    const openedFromDashboard = opensSectionFromDashboard && urlParams.get('from') === 'dashboard';
    const activePreview = opensSectionFromDashboard
        ? requestedSection
        : publicRoutingMode === 'single' ? visibleSections[0] : product.preview;
    const showSectionDashboard = publicRoutingMode === 'dashboard' && !opensSectionFromDashboard;
    const openedFromManageDevice = urlParams.get('from') === 'manage-device';

    return (
        <PublicLanguageProvider productId={productId || ""} defaultLanguage={product.previewLanguage}>
            <ShowProductView
                loaded={loaded}
                product={product}
                productId={productId || ""}
                colorsStyle={colorsStyle}
                passwordProtected={passwordProtected}
                password={password}
                setPassword={setPassword}
                setPasswordProtected={setPasswordProtected}
                publicRoutingMode={publicRoutingMode}
                showSectionDashboard={showSectionDashboard}
                visibleSections={visibleSections}
                openedFromManageDevice={openedFromManageDevice}
                activePreview={activePreview}
                openedFromDashboard={openedFromDashboard}
                profileImageURL={profileImageURL}
                logoImageURL={logoImageURL}
                downloadCV={downloadCV}
            />
        </PublicLanguageProvider>
    );
}

function ShowProductView({
    loaded,
    product,
    productId,
    colorsStyle,
    passwordProtected,
    password,
    setPassword,
    setPasswordProtected,
    publicRoutingMode,
    showSectionDashboard,
    visibleSections,
    openedFromManageDevice,
    activePreview,
    openedFromDashboard,
    profileImageURL,
    logoImageURL,
    downloadCV,
}: {
    loaded: boolean;
    product: Product;
    productId: string;
    colorsStyle: CSSProperties;
    passwordProtected: boolean;
    password: string;
    setPassword: (password: string) => void;
    setPasswordProtected: (protectedPage: boolean) => void;
    publicRoutingMode: string;
    showSectionDashboard: boolean;
    visibleSections: Preview[];
    openedFromManageDevice: boolean;
    activePreview: Preview | null;
    openedFromDashboard: boolean;
    profileImageURL: string;
    logoImageURL: string;
    downloadCV: () => void;
}) {
    const {t} = usePublicLanguage();

    if (!loaded) {
        return (
            <div style={colorsStyle} className="public-loading-page">
                <LoadingPanel text={t("public.loading")}/>
            </div>
        );
    }

    if (product.inactive) {
        return (
            <div style={colorsStyle} className="public-routing-state public-inactive-state">
                <div className="public-routing-card public-inactive-card">
                    <FlexPayzLogo className="public-routing-logo"/>
                    <PublicLanguagePicker/>
                    <h1>{t("public.inactive.title")}</h1>
                    <span>{t("public.inactive.message")}</span>
                </div>
            </div>
        );
    }

    if (passwordProtected) {
        return (
            <div style={colorsStyle} className="password-page">
                <div className="public-routing-card password-card">
                    <FlexPayzLogo className="public-routing-logo"/>
                    <PublicLanguagePicker/>
                    <p>{t("public.protected.kicker")}</p>
                    <h1>{t("public.protected.title")}</h1>
                    <span>{t("public.protected.message")}</span>
                    <TextField
                        label={t("public.password.label")}
                        type="password"
                        className="password-card-input"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value)
                            if (e.target.value === product.publicPagePassword) {
                                setPasswordProtected(false)
                            }
                        }}
                        variant="outlined"
                        size="small"
                        autoComplete="current-password"
                        autoFocus
                        fullWidth
                    />
                </div>
            </div>
        );
    }

    return (<div style={colorsStyle}>
        {loaded && !passwordProtected && publicRoutingMode === 'empty' && <PublicNotConfigured/>}
        {loaded && !passwordProtected && showSectionDashboard && (
            <PublicSectionDashboard
                product={product}
                sections={visibleSections}
                productId={productId}
                fromManageDevice={openedFromManageDevice}
            />
        )}
        {loaded && !passwordProtected && !showSectionDashboard && activePreview === Preview.BUSINESS_CARD &&
            <BusinessCardPublicPage
                product={product}
                productId={productId}
                profileImageURL={profileImageURL}
                logoImageURL={logoImageURL}
                onDownloadCV={downloadCV}
                fromDashboard={openedFromDashboard}
            />}
        {loaded && !passwordProtected && !showSectionDashboard && activePreview === Preview.CUSTOM_LINK &&
            <CustomLinkPublicPage
                product={product}
                productId={productId}
                fromDashboard={openedFromDashboard}
            />}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.UPLOAD_FILE &&
            <UploadFilesPublicPage product={product} productId={productId} fromDashboard={openedFromDashboard}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.UPLOAD_VIDEO &&
            <UploadVideoPublicPage product={product} productId={productId} fromDashboard={openedFromDashboard}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.UPLOAD_SONGS &&
            <UploadSongsPublicPage product={product} productId={productId} fromDashboard={openedFromDashboard}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.BABY_JOURNAL &&
            <BabyJournalPreview product={product} productId={productId} fromDashboard={openedFromDashboard}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.ADULT_JOURNAL &&
            <AdultJournalPreview product={product} productId={productId} fromDashboard={openedFromDashboard}/>}
        {!passwordProtected && !showSectionDashboard && activePreview === Preview.ANIMAL_TAG && <AnimalTagPreviewWrapper/>}

    </div>)
}

function PublicNotConfigured() {
    const {t} = usePublicLanguage();

    return (
        <div className="public-routing-state">
            <div className="public-routing-card">
                <FlexPayzLogo className="public-routing-logo"/>
                <PublicLanguagePicker/>
                <h1>{t("public.empty.title")}</h1>
                <span>{t("public.empty.message")}</span>
            </div>
        </div>
    );
}

function PublicSectionDashboard({product, sections, productId, fromManageDevice}: { product: Product; sections: Preview[]; productId: string; fromManageDevice: boolean }) {
    const visibleDefinitions = PUBLIC_SECTION_ORDER.filter((section) => sections.includes(section.id));
    const {language, t} = usePublicLanguage();

    return (
        <div className="public-routing-state">
            <div className="public-routing-card public-routing-dashboard">
                <div className="public-routing-toolbar">
                    <FlexPayzLogo className="public-routing-logo"/>
                    {fromManageDevice && <BackButton aria-label={t("public.back.device")} className="public-routing-back" href={`/manage-device?product_id=${encodeURIComponent(productId)}`}/>}
                    <PublicLanguagePicker/>
                </div>
                <h1>{product.name || t("public.dashboard.titleFallback")}</h1>
                <span>{t("public.dashboard.message")}</span>
                <div className="public-routing-section-list">
                    {visibleDefinitions.map((section) => (
                        <a
                            key={section.id}
                            href={withPublicLanguageParam(`/show-product?product_id=${encodeURIComponent(productId)}&section=${encodeURIComponent(section.id)}&from=dashboard`, language)}
                            className="public-routing-section"
                        >
                            <span className="public-routing-section-icon" aria-hidden="true">{getPublicSectionIcon(section.id)}</span>
                            <span>
                                <strong>{getPublicSectionTitle(section.id, t)}</strong>
                                <small>{getPublicSectionDescription(section.id, t)}</small>
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}

function getPublicSectionTitle(sectionId: Preview, t: TranslatePublicCopy) {
    switch (sectionId) {
        case Preview.BUSINESS_CARD:
            return t("section.businessCard.title");
        case Preview.CUSTOM_LINK:
            return t("section.customLink.title");
        case Preview.UPLOAD_FILE:
            return t("section.uploadFiles.title");
        case Preview.UPLOAD_VIDEO:
            return t("section.uploadVideo.title");
        case Preview.UPLOAD_SONGS:
            return t("section.uploadSongs.title");
        case Preview.BABY_JOURNAL:
            return t("section.babyJournal.title");
        case Preview.ADULT_JOURNAL:
            return t("section.adultJournal.title");
        case Preview.ANIMAL_TAG:
            return t("section.animalTag.title");
    }
}

function getPublicSectionDescription(sectionId: Preview, t: TranslatePublicCopy) {
    switch (sectionId) {
        case Preview.BUSINESS_CARD:
            return t("section.businessCard.description");
        case Preview.CUSTOM_LINK:
            return t("section.customLink.description");
        case Preview.UPLOAD_FILE:
            return t("section.uploadFiles.description");
        case Preview.UPLOAD_VIDEO:
            return t("section.uploadVideo.description");
        case Preview.UPLOAD_SONGS:
            return t("section.uploadSongs.description");
        case Preview.BABY_JOURNAL:
            return t("section.babyJournal.description");
        case Preview.ADULT_JOURNAL:
            return t("section.adultJournal.description");
        case Preview.ANIMAL_TAG:
            return t("section.animalTag.description");
    }
}

function getPublicSectionIcon(sectionId: Preview) {
    switch (sectionId) {
        case Preview.BUSINESS_CARD:
            return <ContactPageRoundedIcon fontSize="small"/>;
        case Preview.CUSTOM_LINK:
            return <OpenInNewRoundedIcon fontSize="small"/>;
        case Preview.UPLOAD_FILE:
            return <DescriptionRoundedIcon fontSize="small"/>;
        case Preview.UPLOAD_VIDEO:
            return <PlayArrowRoundedIcon fontSize="small"/>;
        case Preview.UPLOAD_SONGS:
            return <MusicNoteRoundedIcon fontSize="small"/>;
        case Preview.BABY_JOURNAL:
            return <ChildCareRoundedIcon fontSize="small"/>;
        case Preview.ADULT_JOURNAL:
            return <HealthAndSafetyRoundedIcon fontSize="small"/>;
        case Preview.ANIMAL_TAG:
            return <PetsRoundedIcon fontSize="small"/>;
    }
}
