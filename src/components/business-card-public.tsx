import {FormEvent, useMemo, useState} from "react";
import {Box, Checkbox, CircularProgress, Modal, TextField} from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import {arrayUnion, doc, updateDoc} from "firebase/firestore";
import {getDownloadURL, ref} from "firebase/storage";
import {db, storage} from "../App";
import {
    downloadGeneratedVCard,
    formatAddress,
    formatCompanyAddress,
    getInitials,
    getPublicName,
    isValidEmail,
    normalizeBusinessCardProduct,
    normalizeExternalUrl,
    sanitizeMailHref,
    sanitizePhoneHref,
} from "../business-card";
import {Product} from "../control-state";
import {AppButton} from "./design-system";
import {PublicPageHeader} from "./public-page-header";
import {translatedText} from "../languages";
import {ReactComponent as FacebookIcon} from "../assets/social/facebook.svg";
import {ReactComponent as InstagramIcon} from "../assets/social/instagram.svg";
import {ReactComponent as TikTokIcon} from "../assets/social/tiktok.svg";
import {ReactComponent as YouTubeIcon} from "../assets/social/youtube.svg";

type BusinessCardPublicPageProps = {
    product: Product;
    productId: string;
    profileImageURL?: string;
    logoImageURL?: string;
    onDownloadCV: () => void;
    fromDashboard?: boolean;
};

type ContactOption = {
    label: string;
    value: string;
    href: string;
    action: string;
    icon: JSX.Element;
    external?: boolean;
};

type ShareStatus = "idle" | "sending" | "sent" | "failed";

export function BusinessCardPublicPage({product, productId, profileImageURL, logoImageURL, onDownloadCV, fromDashboard = false}: BusinessCardPublicPageProps) {
    const normalized = normalizeBusinessCardProduct(product);
    const copy = translatedText[normalized.previewLanguage] || translatedText.english;
    const [contactSheetOpen, setContactSheetOpen] = useState(false);
    const [shareDetailsOpen, setShareDetailsOpen] = useState(false);
    const [pageShareMessage, setPageShareMessage] = useState("");
    const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
    const [shareErrors, setShareErrors] = useState<Record<string, string>>({});
    const [shareForm, setShareForm] = useState({name: "", email: "", phone: "", message: "", consent: false});

    const publicName = getPublicName(normalized);
    const firstName = normalized.firstName || publicName.split(" ")[0] || "this profile";
    const companyAddress = formatCompanyAddress(normalized);
    const contactOptions = useMemo(() => buildContactOptions(normalized), [normalized]);
    const primaryActions = contactOptions.filter((option) => ["Call", "Email", "Open"].includes(option.action)).slice(0, 3);
    const socialLinks = [
        {label: "LinkedIn", value: normalized.linkedIn, icon: "in"},
        {label: "Instagram", value: normalized.instagram, icon: <InstagramIcon/>},
        {label: "Facebook", value: normalized.facebook, icon: <FacebookIcon/>},
        {label: "YouTube", value: normalized.youtube, icon: <YouTubeIcon/>},
        {label: "TikTok", value: normalized.tiktok, icon: <TikTokIcon/>},
    ].filter((social) => social.value);
    const hasCompany = Boolean(normalized.companyName || normalized.companyAbout || companyAddress || normalized.companyPhoneNumber || logoImageURL);

    const downloadVCard = async () => {
        if (!productId) {
            downloadGeneratedVCard(normalized, logoImageURL);
            return;
        }

        try {
            const documentRef = ref(storage, `documents/${productId}/vCard`);
            const url = await getDownloadURL(documentRef);
            const response = await fetch(url);
            if (!response.ok) throw new Error("vCard unavailable");
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = `${publicName.replace(/[^a-z0-9-_]+/gi, "-")}.vcf`;
            link.click();
            URL.revokeObjectURL(objectUrl);
        } catch {
            downloadGeneratedVCard(normalized, logoImageURL);
        }
    };

    const submitSharedDetails = async (event: FormEvent) => {
        event.preventDefault();
        const nextErrors: Record<string, string> = {};
        if (!shareForm.name.trim()) nextErrors.name = "Enter your full name.";
        if (!shareForm.email.trim() && !shareForm.phone.trim()) nextErrors.contact = "Enter at least an email or phone.";
        if (shareForm.email.trim() && !isValidEmail(shareForm.email)) nextErrors.email = "Enter a valid email.";
        if (shareForm.phone.trim() && shareForm.phone.replace(/[^\d+]/g, "").length < 6) nextErrors.phone = "Enter a valid phone.";
        if (!shareForm.consent) nextErrors.consent = "Consent is required.";
        setShareErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0 || !productId) return;

        setShareStatus("sending");
        try {
            await updateDoc(doc(db, "products", productId), {
                sharedContacts: arrayUnion({
                    name: shareForm.name.trim(),
                    email: shareForm.email.trim(),
                    phone: shareForm.phone.trim(),
                    date: Date.now(),
                    ...(shareForm.message.trim() ? {message: shareForm.message.trim()} : {}),
                    consentAccepted: true,
                }),
            });
            setShareStatus("sent");
            setShareForm({name: "", email: "", phone: "", message: "", consent: false});
        } catch {
            setShareStatus("failed");
        }
    };

    return (
        <main className="business-public-page">
            <div className="business-public-shell">
                <PublicPageHeader productId={productId} fromDashboard={fromDashboard} shareTitle={`${publicName} - FlexPayz Business Card`} onShareMessage={setPageShareMessage}/>
                {pageShareMessage && <p className="business-public-live" role="status">{pageShareMessage}</p>}

                <section className="business-public-hero">
                    <div className="business-public-profile">
                        <div className="business-public-media-row">
                            {profileImageURL ? <img src={profileImageURL} alt={`${publicName} profile`}/> : <div className="business-public-avatar" aria-hidden="true">{getInitials(normalized)}</div>}
                            {logoImageURL && <img className="business-public-company-logo" src={logoImageURL} alt={`${normalized.companyName || "Company"} logo`}/>}
                        </div>
                        <h1>{publicName}</h1>
                        {normalized.title && <p>{normalized.title}</p>}
                        {(normalized.companyName || normalized.city) && <strong>{[normalized.companyName, normalized.city].filter(Boolean).join(" · ")}</strong>}
                        {normalized.about && <p className="business-public-about">{normalized.about}</p>}
                        <div className="business-public-actions">
                            <button type="button" className="business-public-button primary" onClick={downloadVCard}>{copy["Save my contact details"]} <span>+</span></button>
                            {primaryActions.map((option) => (
                                <a key={`${option.label}-${option.value}`} className="business-public-button" href={option.href} target={option.external ? "_blank" : undefined} rel={option.external ? "noopener noreferrer" : undefined}>
                                    {option.action}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="business-public-panel">
                        <p className="business-kicker">DIRECT CONTACT</p>
                        <h2>Everything useful, one tap away.</h2>
                        <div className="business-public-contact-list">
                            {contactOptions.slice(0, 4).map((option) => (
                                <a key={`${option.label}-${option.value}`} href={option.href} target={option.external ? "_blank" : undefined} rel={option.external ? "noopener noreferrer" : undefined}>
                                    {option.icon}
                                    <span><small>{option.label}</small><strong>{option.value}</strong></span>
                                    <ArrowOutwardRoundedIcon fontSize="small"/>
                                </a>
                            ))}
                        </div>
                        {socialLinks.length > 0 && (
                            <>
                                <p className="business-kicker">CONNECT</p>
                                <div className="business-public-socials">
                                    {socialLinks.map((social) => (
                                        <a key={social.label} href={normalizeExternalUrl(social.value)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${publicName} on ${social.label}`}>
                                            <span>{social.icon}</span>{social.label}<ArrowOutwardRoundedIcon fontSize="small"/>
                                        </a>
                                    ))}
                                </div>
                            </>
                        )}
                        {normalized.cv && (
                            <button type="button" className="business-public-document" onClick={onDownloadCV}>
                                <span>PDF</span>
                                <strong>{normalized.businessFile || `${publicName} document`}</strong>
                                <small>{copy["Download document"]}</small>
                                <DownloadRoundedIcon/>
                            </button>
                        )}
                        <button type="button" className="business-public-exchange" onClick={() => setShareDetailsOpen(true)}>
                            <small>EXCHANGE DETAILS</small>
                            <strong>Share your details</strong>
                            <span>Send your contact information back.</span>
                            <ArrowOutwardRoundedIcon/>
                        </button>
                    </div>
                </section>

                <section className="business-public-lower">
                    {hasCompany && (
                        <article className="business-public-card">
                            <p className="business-kicker">COMPANY</p>
                            <h2>{normalized.companyName || "Company"}</h2>
                            {normalized.companyAbout && <p>{normalized.companyAbout}</p>}
                            {companyAddress && <strong>{companyAddress}</strong>}
                        </article>
                    )}
                    <button type="button" className="business-public-contact-sheet-trigger" onClick={() => setContactSheetOpen(true)}>
                        All contact options <ArrowOutwardRoundedIcon fontSize="small"/>
                    </button>
                </section>

                <footer className="business-public-footer">Secure · contactless · yours</footer>
            </div>

            <ContactDetailsDialog
                open={contactSheetOpen}
                onClose={() => setContactSheetOpen(false)}
                options={contactOptions}
                onSaveAll={downloadVCard}
            />
            <ShareDetailsDialog
                open={shareDetailsOpen}
                onClose={() => {
                    setShareDetailsOpen(false);
                    setShareStatus("idle");
                    setShareErrors({});
                }}
                firstName={firstName}
                form={shareForm}
                errors={shareErrors}
                status={shareStatus}
                setForm={setShareForm}
                onSubmit={submitSharedDetails}
            />
        </main>
    );
}

function ContactDetailsDialog({open, onClose, options, onSaveAll}: {open: boolean; onClose: () => void; options: ContactOption[]; onSaveAll: () => void}) {
    return (
        <Modal open={open} onClose={onClose} aria-labelledby="business-contact-options-title">
            <Box className="business-public-modal">
                <button type="button" className="business-public-modal-close" aria-label="Close contact options" onClick={onClose}><CloseRoundedIcon/></button>
                <p className="business-kicker">CONTACT DETAILS</p>
                <h2 id="business-contact-options-title">All contact options</h2>
                <div className="business-public-modal-grid">
                    {options.map((option) => (
                        <a key={`${option.label}-${option.value}`} href={option.href} target={option.external ? "_blank" : undefined} rel={option.external ? "noopener noreferrer" : undefined}>
                            {option.icon}
                            <span><small>{option.label}</small><strong>{option.value}</strong></span>
                            <em>{option.action}</em>
                        </a>
                    ))}
                </div>
                <AppButton variant="contained" fullWidth onClick={onSaveAll}>Save all details to contacts</AppButton>
            </Box>
        </Modal>
    );
}

function ShareDetailsDialog({
    open,
    onClose,
    firstName,
    form,
    errors,
    status,
    setForm,
    onSubmit,
}: {
    open: boolean;
    onClose: () => void;
    firstName: string;
    form: {name: string; email: string; phone: string; message: string; consent: boolean};
    errors: Record<string, string>;
    status: ShareStatus;
    setForm: (form: {name: string; email: string; phone: string; message: string; consent: boolean}) => void;
    onSubmit: (event: FormEvent) => void;
}) {
    return (
        <Modal open={open} onClose={onClose} aria-labelledby="business-share-details-title">
            <Box className="business-public-modal business-share-modal">
                <button type="button" className="business-public-modal-close" aria-label="Close share details" onClick={onClose}><CloseRoundedIcon/></button>
                <p className="business-kicker">SHARE YOUR DETAILS</p>
                <h2 id="business-share-details-title">Send your contact back to {firstName}</h2>
                <form onSubmit={onSubmit} className="business-share-form">
                    <TextField label="Full name" value={form.name} onChange={(event) => setForm({...form, name: event.target.value})} error={Boolean(errors.name)} helperText={errors.name} size="small"/>
                    <TextField label="Email" value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} error={Boolean(errors.email || errors.contact)} helperText={errors.email || errors.contact} size="small" type="email" inputMode="email"/>
                    <TextField label="Phone" value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} error={Boolean(errors.phone || errors.contact)} helperText={errors.phone} size="small" type="tel" inputMode="tel"/>
                    <TextField className="wide" label="Message · optional" value={form.message} onChange={(event) => setForm({...form, message: event.target.value})} size="small" multiline minRows={3}/>
                    <label className={`business-share-consent ${errors.consent ? "has-error" : ""}`}>
                        <Checkbox checked={form.consent} onChange={(event) => setForm({...form, consent: event.target.checked})}/>
                        <span>I agree to share these details with this profile owner.</span>
                    </label>
                    {errors.consent && <p className="business-share-error">{errors.consent}</p>}
                    {status === "sent" && <p className="business-share-success" role="status">Details sent.</p>}
                    {status === "failed" && <p className="business-share-error" role="alert">Could not send details. Try again.</p>}
                    <AppButton type="submit" variant="contained" disabled={status === "sending"} endIcon={status === "sending" ? <CircularProgress size={16} color="inherit"/> : <ArrowOutwardRoundedIcon/>}>
                        Send details
                    </AppButton>
                </form>
            </Box>
        </Modal>
    );
}

function buildContactOptions(product: Product): ContactOption[] {
    const emails = [product.email, product.email2, product.email3].filter(Boolean).map((email, index) => ({
        label: index === 0 ? "Email" : `Email ${index + 1}`,
        value: email,
        href: sanitizeMailHref(email),
        action: "Email",
        icon: <MailRoundedIcon/>,
    }));
    const phones = [product.phoneNumber, product.phoneNumber2, product.phoneNumber3].filter(Boolean).map((phone, index) => ({
        label: index === 0 ? "Phone" : `Phone ${index + 1}`,
        value: phone,
        href: sanitizePhoneHref(phone),
        action: "Call",
        icon: <PhoneRoundedIcon/>,
    }));
    const websites = [product.website, product.website2].filter(Boolean).map((website, index) => ({
        label: index === 0 ? "Website" : `Website ${index + 1}`,
        value: website,
        href: normalizeExternalUrl(website),
        action: "Open",
        icon: <PublicRoundedIcon/>,
        external: true,
    }));
    const location = formatAddress(product) ? [{
        label: "Location",
        value: formatAddress(product),
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(product))}`,
        action: "Open",
        icon: <PlaceRoundedIcon/>,
        external: true,
    }] : [];

    return [...emails, ...phones, ...websites, ...location];
}
