import {useProductInformation} from "../control-state";
import VCard from "vcard-creator";
import {SettingsHeader} from "../Pages/manage-device";
import {normalizeSharedContacts, SharedContact} from "../business-card";
import {doc, updateDoc} from "firebase/firestore";
import {useState} from "react";
import {db} from "../App";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {getProductIdFromURL} from "../utils";

function Contact({contact, onDelete}: {contact: SharedContact; onDelete: () => void}) {
    const saveContact = () => {
        const contactVCard = new VCard()
        contactVCard.addName(contact.name)
        if (contact.company) contactVCard.addCompany(contact.company)
        if (contact.email) contactVCard.addEmail(contact.email)
        if (contact.phone) contactVCard.addPhoneNumber(contact.phone)
        const blob = new Blob([contactVCard.toString()], {type: "text/vcard"})
        const file = new File([blob], 'vCard.vcf', {type: "text/vcard"})
        const url = window.URL.createObjectURL(file);

        //create a hidden link and set the href and click it
        const a = document.createElement("a");
        // a.style = "display: none";
        a.href = url;
        a.download = file.name;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    return (
        <article className="shared-contact-card">
            <button type="button" onClick={onDelete} className="shared-contact-delete-button" aria-label={`Delete ${contact.name || "contact"}`}>
                <DeleteOutlineRoundedIcon fontSize="small" aria-hidden="true"/>
            </button>
            <div className="shared-contact-card-header">
                <div>
                    <span className="fp-typography-eyebrow">{formatSharedContactDate(contact.date)}</span>
                    <h2>{contact.name || "Unnamed contact"}</h2>
                </div>
                <button type="button" onClick={saveContact} className="shared-contact-save-button">
                    <DownloadRoundedIcon fontSize="small" aria-hidden="true"/>
                    Save vCard
                </button>
            </div>
            <div className="shared-contact-details">
                {contact.company && (
                    <div className="shared-contact-detail">
                        <span aria-hidden="true"><BusinessRoundedIcon fontSize="small"/></span>
                        <strong>Company</strong>
                        <small>{contact.company}</small>
                    </div>
                )}
                {contact.email && (
                    <a href={`mailto:${contact.email}`} className="shared-contact-detail">
                        <span aria-hidden="true"><EmailOutlinedIcon fontSize="small"/></span>
                        <strong>Email</strong>
                        <small>{contact.email}</small>
                    </a>
                )}
                {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="shared-contact-detail">
                        <span aria-hidden="true"><PhoneOutlinedIcon fontSize="small"/></span>
                        <strong>Phone</strong>
                        <small>{contact.phone}</small>
                    </a>
                )}
                {contact.message && (
                    <div className="shared-contact-detail shared-contact-message">
                        <span aria-hidden="true"><NotesRoundedIcon fontSize="small"/></span>
                        <strong>Message</strong>
                        <small>{contact.message}</small>
                    </div>
                )}
            </div>
        </article>
    )
}

export function SharedContacts() {

    // const {productState} = useContext(ManageProductContext)
    const {productState, setProductState} = useProductInformation()
    const productId = getProductIdFromURL();
    const contacts = normalizeSharedContacts(productState?.sharedContacts)
    const [contactToDelete, setContactToDelete] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState("");
    const contactsExist = contacts.length > 0
    const latestContactDate = getLatestSharedContactDate(contacts)

    const deleteContact = async () => {
        if (contactToDelete === null || !productId) return;

        const nextContacts = contacts.filter((_, index) => index !== contactToDelete);
        try {
            await updateDoc(doc(db, "products", productId), {sharedContacts: nextContacts});
            setProductState((current) => ({...current, sharedContacts: nextContacts}));
            setContactToDelete(null);
            setDeleteError("");
        } catch {
            setDeleteError("Contact could not be deleted. Please try again.");
        }
    };

    return (<div className="settings-page shared-contacts-page">
        <SettingsHeader/>
        <main className="shared-contacts-layout" aria-labelledby="shared-contacts-title">
            <section className="shared-contacts-hero">
                <span className="fp-typography-eyebrow">Shared contacts</span>
                <h1 id="shared-contacts-title">People who reached out</h1>
                <p>
                    Contacts submitted through your public Business Card are collected here,
                    ready to review or save to your address book.
                </p>
            </section>
            <section className="shared-contacts-summary" aria-label="Shared contacts summary">
                <div className="shared-contact-summary-card">
                    <span>Total</span>
                    <strong>{contacts.length}</strong>
                    <small>{contacts.length === 1 ? "contact" : "contacts"}</small>
                </div>
                <div className="shared-contact-summary-card">
                    <span>Latest</span>
                    <strong>{latestContactDate}</strong>
                    <small>most recent share</small>
                </div>
            </section>
            <section className="shared-contacts-panel" aria-label="Shared contact list">
                <div className="shared-contacts-panel-heading">
                    <div>
                        <span className="fp-typography-eyebrow">Inbox</span>
                        <h2>{productState?.name ? `${productState.name} contacts` : "Contact list"}</h2>
                    </div>
                    <span className="shared-contacts-count-pill">
                        <AccessTimeRoundedIcon fontSize="small" aria-hidden="true"/>
                        Updated automatically
                    </span>
                </div>
                {!contactsExist && (
                    <div className="shared-contacts-empty">
                        <h3>No shared contacts yet</h3>
                        <p>When someone shares their details from your public Business Card, they will appear here.</p>
                    </div>
                )}
                {contactsExist && (
                    <div className="shared-contact-list">
                        {contacts.map((contact, index) => (
                            <Contact
                                key={`${contact.date}-${contact.email}-${contact.phone}-${contact.name}-${contact.company || ""}`}
                                contact={contact}
                                onDelete={() => {
                                    setContactToDelete(index);
                                    setDeleteError("");
                                }}
                            />
                        ))}
                    </div>
                )}
            </section>
        </main>
        {contactToDelete !== null && (
            <div className="shared-contact-confirm-backdrop" role="presentation">
                <div className="shared-contact-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="shared-contact-delete-title">
                    <h2 id="shared-contact-delete-title">Delete contact card?</h2>
                    <p>This removes {contacts[contactToDelete]?.name || "this contact"} from your shared contacts. This action cannot be undone.</p>
                    {deleteError && <p className="shared-contact-delete-error" role="alert">{deleteError}</p>}
                    <div className="shared-contact-confirm-actions">
                        <button type="button" className="shared-contact-cancel-button" onClick={() => setContactToDelete(null)}>Cancel</button>
                        <button type="button" className="shared-contact-confirm-delete-button" onClick={deleteContact}>Delete contact</button>
                    </div>
                </div>
            </div>
        )}
    </div>)
}

function formatSharedContactDate(date: number) {
    if (!date) return "No date";

    const timestamp = date < 10000000000 ? date * 1000 : date;
    const parsedDate = new Date(timestamp);
    if (Number.isNaN(parsedDate.getTime())) return "No date";

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(parsedDate);
}

function getLatestSharedContactDate(contacts: SharedContact[]) {
    const latestTimestamp = contacts.reduce((latest, contact) => Math.max(latest, contact.date || 0), 0);
    return latestTimestamp ? formatSharedContactDate(latestTimestamp) : "None";
}
