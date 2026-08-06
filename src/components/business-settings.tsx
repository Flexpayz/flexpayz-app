import {ChangeEvent, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Box, CircularProgress, TextField} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {getDownloadURL, ref, uploadBytes} from "firebase/storage";
import {useNavigate} from "react-router";
import {db, storage} from "../App";
import {
    calculateBusinessCardCompletion,
    isValidEmail,
    isValidUrlDraft,
    normalizeBusinessCardProduct,
    serializeBusinessCardUpdate
} from "../business-card";
import {defaultProduct, Product} from "../control-state";
import {ManageProductContext} from "../contexts";
import {PageShell, FlexPayzLogo, AppButton, BackButton} from "./design-system";
import ImageUpload from "./image-upload";
import {getProductIdFromURL} from "../utils";
import {useSaveBusinessCardData} from "../useProductData";
import "../Pages/manager.css";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "failed";
type UploadState = "idle" | "uploading" | "ready" | "failed";

const TEXT_AUTOSAVE_DELAY = 1200;
const ABOUT_LIMIT = 260;

const TEXT_FIELDS: (keyof Product)[] = [
    "firstName",
    "lastName",
    "title",
    "email",
    "email2",
    "email3",
    "phoneNumber",
    "phoneNumber2",
    "phoneNumber3",
    "website",
    "website2",
    "about",
    "address",
    "address2",
    "zipCode",
    "city",
    "country",
    "linkedIn",
    "instagram",
    "facebook",
    "youtube",
    "tiktok",
    "companyName",
    "companyRegNumber",
    "companyAddress",
    "companyCity",
    "companyCountry",
    "companyPhoneNumber",
    "companyAbout",
    "businessFile",
];

export function BusinessSettingsWrapper() {
    const productId = getProductIdFromURL();
    const [productState, setProductState] = useState<Product>(defaultProduct);
    const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");

    useEffect(() => {
        let active = true;

        async function loadProduct() {
            if (!productId) {
                setStatus("not-found");
                return;
            }

            try {
                const productRef = doc(db, "products", productId);
                const snapshot = await getDoc(productRef);
                if (!active) return;
                if (!snapshot.exists()) {
                    setStatus("not-found");
                    return;
                }
                setProductState(normalizeBusinessCardProduct(snapshot.data() as Partial<Product>));
                setStatus("ready");
            } catch {
                if (active) setStatus("error");
            }
        }

        loadProduct();

        return () => {
            active = false;
        };
    }, [productId]);

    return (
        <ManageProductContext.Provider value={{productState, setProductState, invalidFields: new Map()}}>
            {status === "ready" ? <BusinessSettings/> : <BusinessCardEditorState state={status}/>}
        </ManageProductContext.Provider>
    );
}

export function BusinessSettings() {
    const navigate = useNavigate();
    const productId = getProductIdFromURL();
    const {productState, setProductState} = useContext(ManageProductContext);
    const saveBusinessCardData = useSaveBusinessCardData();
    const [profileImageURL, setProfileImageURL] = useState("");
    const [logoImageURL, setLogoImageURL] = useState(productState.logo || "");
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [saveMessage, setSaveMessage] = useState("Autosave on");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [logoUploadState, setLogoUploadState] = useState<UploadState>(productState.logo ? "ready" : "idle");
    const [cvUploadState, setCvUploadState] = useState<UploadState>(productState.cv ? "ready" : "idle");
    const [showOptional, setShowOptional] = useState({
        email2: Boolean(productState.email2),
        email3: Boolean(productState.email3),
        phoneNumber2: Boolean(productState.phoneNumber2),
        phoneNumber3: Boolean(productState.phoneNumber3),
        website2: Boolean(productState.website2),
    });
    const autosaveTimer = useRef<number | undefined>();
    const lastSavedPayload = useRef(JSON.stringify(serializeBusinessCardUpdate(productState)));
    const isAutosaving = useRef(false);

    useEffect(() => {
        if (!productId) return;
        const imageRef = ref(storage, `images/${productId}`);
        getDownloadURL(imageRef).then(setProfileImageURL).catch(() => undefined);
        const logoRef = ref(storage, `images/logo-${productId}`);
        getDownloadURL(logoRef).then((url) => {
            setLogoImageURL(url);
            setProductState((prev: Product) => ({...prev, logo: url}));
            setLogoUploadState("ready");
        }).catch(() => undefined);
    }, [productId, setProductState]);

    const completion = useMemo(
        () => calculateBusinessCardCompletion(productState, Boolean(profileImageURL)),
        [productState, profileImageURL]
    );

    const updateField = useCallback((field: keyof Product, value: string | boolean) => {
        setProductState((prev: Product) => ({...prev, [field]: value}));
        if (TEXT_FIELDS.includes(field)) {
            setSaveState("dirty");
            setSaveMessage("Unsaved changes");
        }
    }, [setProductState]);

    const validation = useMemo(() => validateBusinessCard(productState), [productState]);

    useEffect(() => {
        if (saveState !== "dirty" || isAutosaving.current || Object.keys(validation).length > 0 || !productId) return;

        window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = window.setTimeout(async () => {
            const payload = JSON.stringify(serializeBusinessCardUpdate(productState));
            if (payload === lastSavedPayload.current) return;

            isAutosaving.current = true;
            setSaveState("saving");
            setSaveMessage("Autosaving");
            try {
                await updateDoc(doc(db, "products", productId), serializeBusinessCardUpdate(productState));
                lastSavedPayload.current = payload;
                setSaveState("saved");
                setSaveMessage("Autosaved just now");
            } catch {
                setSaveState("failed");
                setSaveMessage("Autosave failed. Your draft is still here.");
            } finally {
                isAutosaving.current = false;
            }
        }, TEXT_AUTOSAVE_DELAY);

        return () => window.clearTimeout(autosaveTimer.current);
    }, [productId, productState, saveState, validation]);

    const saveChanges = async (event?: FormEvent) => {
        event?.preventDefault();
        const nextErrors = validateBusinessCard(productState);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setSaveState("failed");
            setSaveMessage("Fix the highlighted fields before saving.");
            return;
        }

        window.clearTimeout(autosaveTimer.current);
        setSaveState("saving");
        setSaveMessage("Saving changes");
        try {
            await saveBusinessCardData();
            lastSavedPayload.current = JSON.stringify(serializeBusinessCardUpdate(productState));
            setSaveState("saved");
            setSaveMessage("Changes saved");
        } catch {
            setSaveState("failed");
            setSaveMessage("Save failed. Your draft is still here.");
        }
    };

    const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !productId) return;
        if (!file.type.startsWith("image/")) {
            setLogoUploadState("failed");
            return;
        }

        setLogoUploadState("uploading");
        try {
            const logoRef = ref(storage, `images/logo-${productId}`);
            await uploadBytes(logoRef, file);
            const url = await getDownloadURL(logoRef);
            await updateDoc(doc(db, "products", productId), {logo: url});
            setLogoImageURL(url);
            updateField("logo", url);
            setLogoUploadState("ready");
        } catch {
            setLogoUploadState("failed");
        }
    };

    const uploadCV = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !productId) return;
        if (file.type !== "application/pdf") {
            setCvUploadState("failed");
            return;
        }

        setCvUploadState("uploading");
        try {
            const cvRef = ref(storage, `documents/${productId}/CV`);
            await uploadBytes(cvRef, file);
            await updateDoc(doc(db, "products", productId), {cv: true, businessFile: file.name});
            updateField("cv", true);
            updateField("businessFile", file.name);
            setCvUploadState("ready");
        } catch {
            setCvUploadState("failed");
        }
    };

    return (
        <PageShell bleed className="business-editor-shell" sx={{py: 0}}>
            <Box className="business-editor-layout">
                <aside className="business-editor-sidebar" aria-label="Business Card editor navigation">
                    <FlexPayzLogo className="business-editor-logo"/>
                    <div className="business-editor-side-avatar" aria-hidden="true">BC</div>
                    <p className="workspace-sidebar-kicker">{productState.name || "FlexPayz product"}</p>
                    <h2>Business Card</h2>
                    <nav>
                        <a href="/manage-device">Overview</a>
                        <a href="/manage-device?tab=content">Content</a>
                        <a className="is-active" href="#business-card-editor">Business Card <ArrowForwardRoundedIcon fontSize="small"/></a>
                        <a href="/manage-device?tab=settings">Settings</a>
                    </nav>
                    <div className="business-editor-completion">
                        <span>Completion</span>
                        <strong>{completion}%</strong>
                        <div className="business-completion-meter" aria-hidden="true"><i style={{transform: `scaleX(${completion / 100})`}}/></div>
                        <small>{completion >= 80 ? "Profile and contact are ready." : "Complete the essentials first."}</small>
                    </div>
                    <div className="business-autosave-card" aria-live="polite">
                        <strong>{saveState === "failed" ? "Needs attention" : "Autosave on"}</strong>
                        <span>{saveMessage}</span>
                    </div>
                </aside>

                <main id="business-card-editor" className="business-editor-main">
                    <header className="business-editor-header">
                        <BackButton aria-label="Back to device workspace" onClick={() => navigate(`/manage-device?product_id=${productId}`)}/>
                        <div>
                            <p className="business-kicker">BUSINESS CARD EDITOR</p>
                            <h1><span className="desktop-heading">Build your Business Card</span><span className="mobile-heading">Build your profile</span></h1>
                            <p>Complete the essentials first. You can refine details later.</p>
                        </div>
                        <div className={`business-save-pill ${saveState}`} aria-live="polite">
                            {saveState === "saving" ? <CircularProgress size={16} color="inherit"/> : saveState === "saved" ? <CheckRoundedIcon fontSize="small"/> : null}
                            <span>{saveState === "dirty" ? "Unsaved" : saveState === "failed" ? "Failed" : saveState === "saving" ? "Saving" : "Autosaved"}</span>
                        </div>
                    </header>

                    <form className="business-editor-form" onSubmit={saveChanges}>
                        <BusinessCardCompletion completion={completion}/>
                        <EditorSection number="01" eyebrow="PROFILE" title="Your introduction">
                            <div className="business-profile-grid">
                                <div className="business-photo-card">
                                    {profileImageURL ? <img src={profileImageURL} alt="Current profile"/> : <div className="business-avatar-fallback" aria-hidden="true">{getInitials(productState)}</div>}
                                    <ImageUpload/>
                                    <small>JPG or PNG · max 5 MB</small>
                                </div>
                                <div className="business-field-grid">
                                    <EditorTextField label="First name" value={productState.firstName} onChange={(value) => updateField("firstName", value)} autoComplete="given-name"/>
                                    <EditorTextField label="Last name" value={productState.lastName} onChange={(value) => updateField("lastName", value)} autoComplete="family-name"/>
                                    <EditorTextField label="Professional title" value={productState.title} onChange={(value) => updateField("title", value)} autoComplete="organization-title"/>
                                    <EditorTextField className="wide" label="About" value={productState.about} onChange={(value) => updateField("about", value)} multiline minRows={3} error={errors.about} helperText={`${productState.about.length} / ${ABOUT_LIMIT}`}/>
                                </div>
                            </div>
                        </EditorSection>

                        <EditorSection number="02" eyebrow="CONTACT" title="How people reach you">
                            <div className="business-field-grid">
                                <EditorTextField label="Primary email" value={productState.email} onChange={(value) => updateField("email", value)} error={errors.email} type="email" inputMode="email" autoComplete="email"/>
                                <EditorTextField label="Primary phone" value={productState.phoneNumber} onChange={(value) => updateField("phoneNumber", value)} type="tel" inputMode="tel" autoComplete="tel"/>
                                <EditorTextField label="Website" value={productState.website} onChange={(value) => updateField("website", value)} error={errors.website} inputMode="url" autoComplete="url"/>
                                <EditorTextField label="Location" value={productState.city} onChange={(value) => updateField("city", value)} autoComplete="address-level2"/>
                                {showOptional.email2 && <OptionalField label="Additional email 2" value={productState.email2} error={errors.email2} onChange={(value) => updateField("email2", value)} onRemove={() => { updateField("email2", ""); setShowOptional((prev) => ({...prev, email2: false})); }}/>}
                                {showOptional.email3 && <OptionalField label="Additional email 3" value={productState.email3} error={errors.email3} onChange={(value) => updateField("email3", value)} onRemove={() => { updateField("email3", ""); setShowOptional((prev) => ({...prev, email3: false})); }}/>}
                                {showOptional.phoneNumber2 && <OptionalField label="Additional phone 2" value={productState.phoneNumber2} onChange={(value) => updateField("phoneNumber2", value)} onRemove={() => { updateField("phoneNumber2", ""); setShowOptional((prev) => ({...prev, phoneNumber2: false})); }}/>}
                                {showOptional.phoneNumber3 && <OptionalField label="Additional phone 3" value={productState.phoneNumber3} onChange={(value) => updateField("phoneNumber3", value)} onRemove={() => { updateField("phoneNumber3", ""); setShowOptional((prev) => ({...prev, phoneNumber3: false})); }}/>}
                                {showOptional.website2 && <OptionalField label="Secondary website" value={productState.website2} error={errors.website2} onChange={(value) => updateField("website2", value)} onRemove={() => { updateField("website2", ""); setShowOptional((prev) => ({...prev, website2: false})); }}/>}
                                <EditorTextField label="Street address" value={productState.address} onChange={(value) => updateField("address", value)} autoComplete="street-address"/>
                                <EditorTextField label="Street address 2" value={productState.address2} onChange={(value) => updateField("address2", value)}/>
                                <EditorTextField label="Zip code" value={productState.zipCode} onChange={(value) => updateField("zipCode", value)} autoComplete="postal-code"/>
                                <EditorTextField label="Country" value={productState.country} onChange={(value) => updateField("country", value)} autoComplete="country-name"/>
                            </div>
                            <div className="business-inline-actions">
                                {!showOptional.email2 && <button type="button" onClick={() => setShowOptional((prev) => ({...prev, email2: true}))}>+ Add another email</button>}
                                {!showOptional.phoneNumber2 && <button type="button" onClick={() => setShowOptional((prev) => ({...prev, phoneNumber2: true}))}>+ Add another phone</button>}
                                {!showOptional.website2 && <button type="button" onClick={() => setShowOptional((prev) => ({...prev, website2: true}))}>+ Add another website</button>}
                            </div>
                        </EditorSection>

                        <EditorSection number="03" eyebrow="COMPANY" title="Professional context">
                            <div className="business-company-grid">
                                <label className="business-upload-tile">
                                    <input type="file" accept="image/*" onChange={uploadLogo}/>
                                    {logoImageURL ? <img src={logoImageURL} alt="Company logo"/> : <span>{getCompanyInitials(productState)}</span>}
                                    <strong>{logoUploadState === "uploading" ? "Uploading logo" : logoUploadState === "failed" ? "Logo upload failed" : "Company logo"}</strong>
                                    <small>Logo uploaded · Replace</small>
                                </label>
                                <div className="business-field-grid">
                                    <EditorTextField label="Company name" value={productState.companyName} onChange={(value) => updateField("companyName", value)} autoComplete="organization"/>
                                    <EditorTextField label="Registration number" value={productState.companyRegNumber} onChange={(value) => updateField("companyRegNumber", value)}/>
                                    <EditorTextField label="Company phone" value={productState.companyPhoneNumber} onChange={(value) => updateField("companyPhoneNumber", value)} type="tel" inputMode="tel"/>
                                    <EditorTextField label="Company city" value={productState.companyCity} onChange={(value) => updateField("companyCity", value)}/>
                                    <EditorTextField className="wide" label="Company address" value={productState.companyAddress} onChange={(value) => updateField("companyAddress", value)}/>
                                    <EditorTextField label="Company country" value={productState.companyCountry} onChange={(value) => updateField("companyCountry", value)}/>
                                    <EditorTextField className="wide" label="Company description" value={productState.companyAbout} onChange={(value) => updateField("companyAbout", value)} multiline minRows={2}/>
                                </div>
                            </div>
                        </EditorSection>

                        <EditorSection number="04" eyebrow="SOCIAL" title="Selected networks">
                            <div className="business-social-grid">
                                <SocialField icon="in" label="LinkedIn" value={productState.linkedIn} onChange={(value) => updateField("linkedIn", value)} error={errors.linkedIn}/>
                                <SocialField icon="◎" label="Instagram" value={productState.instagram} onChange={(value) => updateField("instagram", value)} error={errors.instagram}/>
                                <SocialField icon="f" label="Facebook" value={productState.facebook} onChange={(value) => updateField("facebook", value)} error={errors.facebook}/>
                                <SocialField icon="▶" label="YouTube" value={productState.youtube} onChange={(value) => updateField("youtube", value)} error={errors.youtube}/>
                                <SocialField icon="♪" label="TikTok" value={productState.tiktok} onChange={(value) => updateField("tiktok", value)} error={errors.tiktok}/>
                            </div>
                        </EditorSection>

                        <EditorSection number="05" eyebrow="DOCUMENT" title="Share a useful file">
                            <label className={`business-document-upload ${cvUploadState}`}>
                                <input type="file" accept="application/pdf,.pdf" onChange={uploadCV}/>
                                <DescriptionRoundedIcon/>
                                <strong>{productState.businessFile || "Add CV or profile PDF"}</strong>
                                <small>{cvUploadState === "uploading" ? "Uploading PDF" : cvUploadState === "failed" ? "PDF upload failed. Try again." : productState.cv ? "Ready · Replace" : "PDF only"}</small>
                            </label>
                        </EditorSection>

                        <div className="business-theme-info" aria-label="Fixed appearance">
                            <span className="business-theme-dots" aria-hidden="true"><i/><b/></span>
                            <div>
                                <strong>Champagne</strong>
                                <small>Fixed default appearance</small>
                            </div>
                            <em>DEFAULT</em>
                        </div>

                        <div className="business-save-bar" aria-live="polite">
                            <span>{saveMessage}</span>
                            <AppButton type="submit" variant="contained" disabled={saveState === "saving"} endIcon={saveState === "saving" ? <CircularProgress size={18} color="inherit"/> : <ArrowForwardRoundedIcon/>}>
                                Save changes
                            </AppButton>
                        </div>
                    </form>
                </main>
            </Box>
        </PageShell>
    );
}

function BusinessCardEditorState({state}: {state: "loading" | "not-found" | "error"}) {
    return (
        <PageShell bleed className="business-editor-shell">
            <div className="business-editor-state" role={state === "loading" ? "status" : "alert"}>
                <FlexPayzLogo/>
                {state === "loading" ? <CircularProgress size={28}/> : null}
                <h1>{state === "loading" ? "Loading Business Card" : state === "not-found" ? "Device not found" : "Business Card unavailable"}</h1>
                <p>{state === "loading" ? "Preparing your editor." : "Return to My Devices and try again."}</p>
            </div>
        </PageShell>
    );
}

function BusinessCardCompletion({completion}: {completion: number}) {
    return (
        <section className="business-completion-card" aria-label="Profile completion">
            <div>
                <CheckRoundedIcon/>
                <strong>Profile strength</strong>
                <span>{completion >= 80 ? "Strong foundation" : "Complete the essentials"}</span>
            </div>
            <div className="business-completion-meter" aria-hidden="true"><i style={{transform: `scaleX(${completion / 100})`}}/></div>
            <strong>{completion}%</strong>
        </section>
    );
}

function EditorSection({number, eyebrow, title, children}: {number: string; eyebrow: string; title: string; children: ReactNode}) {
    return (
        <section className="business-editor-section">
            <p><span>{number}</span> · {eyebrow}</p>
            <h2>{title}</h2>
            {children}
        </section>
    );
}

type EditorTextFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    helperText?: string;
    type?: string;
    inputMode?: "text" | "email" | "tel" | "url";
    autoComplete?: string;
    multiline?: boolean;
    minRows?: number;
    className?: string;
};

function EditorTextField({label, value, onChange, error, helperText, className, ...props}: EditorTextFieldProps) {
    return (
        <TextField
            {...props}
            className={className}
            label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            error={Boolean(error)}
            helperText={error || helperText}
            variant="outlined"
            size="small"
            fullWidth
        />
    );
}

function OptionalField({onRemove, ...fieldProps}: EditorTextFieldProps & {onRemove: () => void}) {
    return (
        <div className="business-optional-field">
            <EditorTextField {...fieldProps}/>
            <button type="button" onClick={onRemove}>Remove</button>
        </div>
    );
}

function SocialField({icon, label, value, onChange, error}: {icon: string; label: string; value: string; onChange: (value: string) => void; error?: string}) {
    return (
        <div className="business-social-field">
            <span aria-hidden="true">{icon}</span>
            <EditorTextField label={label} value={value} onChange={onChange} error={error} inputMode="url"/>
            <small>{value ? "Connected" : "Add"}</small>
        </div>
    );
}

function validateBusinessCard(product: Product) {
    const errors: Record<string, string> = {};

    ["email", "email2", "email3"].forEach((field) => {
        if (!isValidEmail(product[field as keyof Product] as string)) {
            errors[field] = "Enter a valid email address.";
        }
    });

    ["website", "website2", "linkedIn", "instagram", "facebook", "youtube", "tiktok"].forEach((field) => {
        if (!isValidUrlDraft(product[field as keyof Product] as string)) {
            errors[field] = "Enter a valid URL.";
        }
    });

    if (product.about.length > ABOUT_LIMIT) {
        errors.about = `Keep About to ${ABOUT_LIMIT} characters before saving.`;
    }

    return errors;
}

function getInitials(product: Product) {
    const source = [product.firstName, product.lastName].filter(Boolean).join(" ") || product.companyName || "FP";
    return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FP";
}

function getCompanyInitials(product: Product) {
    return (product.companyName || "Company").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CO";
}
