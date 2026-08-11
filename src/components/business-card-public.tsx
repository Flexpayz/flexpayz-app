import {FormEvent, useMemo, useState} from "react";
import {Box, Checkbox, CircularProgress, Modal, TextField} from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
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
import {TranslatePublicCopy, usePublicLanguage} from "../public-i18n";
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
    const {t} = usePublicLanguage();
    const [contactSheetOpen, setContactSheetOpen] = useState(false);
    const [shareDetailsOpen, setShareDetailsOpen] = useState(false);
    const [pageShareMessage, setPageShareMessage] = useState("");
    const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
    const [shareErrors, setShareErrors] = useState<Record<string, string>>({});
    const [shareForm, setShareForm] = useState({name: "", company: "", email: "", phone: "", message: "", consent: false});

    const publicName = getPublicName(normalized);
    const firstName = normalized.firstName || publicName.split(" ")[0] || "this profile";
    const companyAddress = formatCompanyAddress(normalized);
    const contactOptions = useMemo(() => buildContactOptions(normalized, t), [normalized, t]);
    const primaryActions = contactOptions.slice(0, 3);
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
        if (!shareForm.name.trim()) nextErrors.name = t("business.error.name");
        if (!shareForm.email.trim() && !shareForm.phone.trim()) nextErrors.contact = t("business.error.contact");
        if (shareForm.email.trim() && !isValidEmail(shareForm.email)) nextErrors.email = t("business.error.email");
        if (shareForm.phone.trim() && shareForm.phone.replace(/[^\d+]/g, "").length < 6) nextErrors.phone = t("business.error.phone");
        if (!shareForm.consent) nextErrors.consent = t("business.error.consent");
        setShareErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0 || !productId) return;

        setShareStatus("sending");
        try {
            await updateDoc(doc(db, "products", productId), {
                sharedContacts: arrayUnion({
                    name: shareForm.name.trim(),
                    ...(shareForm.company.trim() ? {company: shareForm.company.trim()} : {}),
                    email: shareForm.email.trim(),
                    phone: shareForm.phone.trim(),
                    date: Date.now(),
                    ...(shareForm.message.trim() ? {message: shareForm.message.trim()} : {}),
                    consentAccepted: true,
                }),
            });
            setShareStatus("sent");
            setShareForm({name: "", company: "", email: "", phone: "", message: "", consent: false});
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
                            <button type="button" className="business-public-button primary" onClick={downloadVCard}>{t("business.saveContact")} <span>+</span></button>
                            {primaryActions.map((option) => (
                                <a key={`${option.label}-${option.value}`} className="business-public-button" href={option.href} target={option.external ? "_blank" : undefined} rel={option.external ? "noopener noreferrer" : undefined}>
                                    {option.action}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="business-public-panel">
                        <p className="business-kicker">{t("business.directContact")}</p>
                        <h2>{t("business.directContactTitle")}</h2>
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
                                <p className="business-kicker">{t("business.connect")}</p>
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
                                <span aria-hidden="true"><DescriptionRoundedIcon fontSize="small"/></span>
                                <strong>{normalized.businessFile || `${publicName} document`}</strong>
                                <DownloadRoundedIcon aria-hidden="true"/>
                            </button>
                        )}
                        <button type="button" className="business-public-exchange" onClick={() => setShareDetailsOpen(true)}>
                            <small>{t("business.exchange.kicker")}</small>
                            <strong>{t("business.exchange.title")}</strong>
                            <ArrowOutwardRoundedIcon/>
                        </button>
                    </div>
                </section>

                <section className="business-public-lower">
                    {hasCompany && (
                        <article className="business-public-card">
                            <p className="business-kicker">{t("business.company")}</p>
                            <h2>{normalized.companyName || t("business.companyFallback")}</h2>
                            {normalized.companyAbout && <p>{normalized.companyAbout}</p>}
                            {companyAddress && <strong>{companyAddress}</strong>}
                        </article>
                    )}
                    <button type="button" className="business-public-contact-sheet-trigger" onClick={() => setContactSheetOpen(true)}>
                        {t("business.allContactOptions")} <ArrowOutwardRoundedIcon fontSize="small"/>
                    </button>
                </section>

                <footer className="business-public-footer">{t("business.footer")}</footer>
            </div>

            <ContactDetailsDialog
                open={contactSheetOpen}
                onClose={() => setContactSheetOpen(false)}
                options={contactOptions}
                onSaveAll={downloadVCard}
                t={t}
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
                t={t}
            />
        </main>
    );
}

function ContactDetailsDialog({open, onClose, options, onSaveAll, t}: {open: boolean; onClose: () => void; options: ContactOption[]; onSaveAll: () => void; t: TranslatePublicCopy}) {
    return (
        <Modal open={open} onClose={onClose} aria-labelledby="business-contact-options-title">
            <Box className="business-public-modal">
                <button type="button" className="business-public-modal-close" aria-label={t("business.modal.contact.close")} onClick={onClose}><CloseRoundedIcon/></button>
                <p className="business-kicker">{t("business.modal.contact.kicker")}</p>
                <h2 id="business-contact-options-title">{t("business.modal.contact.title")}</h2>
                <div className="business-public-modal-grid">
                    {options.map((option) => (
                        <a key={`${option.label}-${option.value}`} href={option.href} target={option.external ? "_blank" : undefined} rel={option.external ? "noopener noreferrer" : undefined}>
                            {option.icon}
                            <span><small>{option.label}</small><strong>{option.value}</strong></span>
                            <em>{option.action}</em>
                        </a>
                    ))}
                </div>
                <AppButton variant="contained" fullWidth onClick={onSaveAll}>{t("business.modal.contact.saveAll")}</AppButton>
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
    t,
}: {
    open: boolean;
    onClose: () => void;
    firstName: string;
    form: {name: string; company: string; email: string; phone: string; message: string; consent: boolean};
    errors: Record<string, string>;
    status: ShareStatus;
    setForm: (form: {name: string; company: string; email: string; phone: string; message: string; consent: boolean}) => void;
    onSubmit: (event: FormEvent) => void;
    t: TranslatePublicCopy;
}) {
    return (
        <Modal open={open} onClose={onClose} aria-labelledby="business-share-details-title">
            <Box className="business-public-modal business-share-modal">
                <button type="button" className="business-public-modal-close" aria-label={t("business.modal.share.close")} onClick={onClose}><CloseRoundedIcon/></button>
                <p className="business-kicker">{t("business.modal.share.kicker")}</p>
                {status === "sent" ? (
                    <div className="business-share-thank-you" role="status">
                        <h2 id="business-share-details-title">{t("business.modal.share.thanks")}</h2>
                        <p>{t("business.modal.share.sent")}</p>
                        <AppButton variant="contained" onClick={onClose}>{t("business.modal.share.closeAction")}</AppButton>
                    </div>
                ) : (
                    <>
                        <h2 id="business-share-details-title">{t("business.modal.share.title", {name: firstName})}</h2>
                        <form onSubmit={onSubmit} className="business-share-form">
                            <TextField label={t("business.form.fullName")} value={form.name} onChange={(event) => setForm({...form, name: event.target.value})} error={Boolean(errors.name)} helperText={errors.name} size="small"/>
                            <TextField label={t("business.form.company")} value={form.company} onChange={(event) => setForm({...form, company: event.target.value})} size="small"/>
                            <TextField label={t("business.form.email")} value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} error={Boolean(errors.email || errors.contact)} helperText={errors.email || errors.contact} size="small" type="email" inputMode="email"/>
                            <TextField label={t("business.form.phone")} value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} error={Boolean(errors.phone || errors.contact)} helperText={errors.phone} size="small" type="tel" inputMode="tel"/>
                            <TextField className="wide" label={t("business.form.message")} value={form.message} onChange={(event) => setForm({...form, message: event.target.value})} size="small" multiline minRows={3}/>
                            <label className={`business-share-consent ${errors.consent ? "has-error" : ""}`}>
                                <Checkbox checked={form.consent} onChange={(event) => setForm({...form, consent: event.target.checked})}/>
                                <span>{t("business.form.consent")}</span>
                            </label>
                            {errors.consent && <p className="business-share-error">{errors.consent}</p>}
                            {status === "failed" && <p className="business-share-error" role="alert">{t("business.error.send")}</p>}
                            <AppButton type="submit" variant="contained" disabled={status === "sending"} endIcon={status === "sending" ? <CircularProgress size={16} color="inherit"/> : <ArrowOutwardRoundedIcon/>}>
                                {t("business.form.send")}
                            </AppButton>
                        </form>
                    </>
                )}
            </Box>
        </Modal>
    );
}

function buildContactOptions(product: Product, t: TranslatePublicCopy): ContactOption[] {
    const emails = [product.email, product.email2, product.email3].filter(Boolean).map((email, index) => ({
        label: index === 0 ? t("business.form.email") : `${t("business.form.email")} ${index + 1}`,
        value: email,
        href: sanitizeMailHref(email),
        action: t("business.action.email"),
        icon: <MailRoundedIcon/>,
    }));
    const phones = [product.phoneNumber, product.phoneNumber2, product.phoneNumber3].filter(Boolean).map((phone, index) => ({
        label: index === 0 ? t("business.form.phone") : `${t("business.form.phone")} ${index + 1}`,
        value: phone,
        href: sanitizePhoneHref(phone),
        action: t("business.action.call"),
        icon: <PhoneRoundedIcon/>,
    }));
    const websites = [product.website, product.website2].filter(Boolean).map((website, index) => ({
        label: index === 0 ? t("business.label.website") : `${t("business.label.website")} ${index + 1}`,
        value: website,
        href: normalizeExternalUrl(website),
        action: t("business.action.open"),
        icon: <PublicRoundedIcon/>,
        external: true,
    }));
    const location = formatAddress(product) ? [{
        label: t("business.label.location"),
        value: formatAddress(product),
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(product))}`,
        action: t("business.action.open"),
        icon: <PlaceRoundedIcon/>,
        external: true,
    }] : [];

    return [...emails, ...phones, ...websites, ...location];
}
