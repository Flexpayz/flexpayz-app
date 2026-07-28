import {useProductInformation} from "../control-state";
import VCard from "vcard-creator";
import {SettingsHeader} from "../Pages/manage-device";
import {normalizeSharedContacts, SharedContact} from "../business-card";

function Contact({contact}: {contact: SharedContact}) {
    const saveContact = () => {
        const contactVCard = new VCard()
        contactVCard.addName(contact.name)
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
        <div className={'contact-box'}>
            <span>{contact.name}</span>
            {contact.email && <small>{contact.email}</small>}
            {contact.phone && <small>{contact.phone}</small>}
            {contact.message && <p>{contact.message}</p>}
            <button onClick={saveContact}>Save Contact</button>
        </div>
    )
}

export function SharedContacts() {

    // const {productState} = useContext(ManageProductContext)
    const {productState} = useProductInformation()
    const contacts = normalizeSharedContacts(productState?.sharedContacts)
    const contactsExist = contacts.length > 0


    return (<div className={'settings-page'}>
        <SettingsHeader/>
        <div className={'section-title'}>Shared Contacts</div>
        {!contactsExist && <div className={'explanation-text'}> You have no shared contacts yet.</div>}
        {contacts.map((contact) => (<Contact key={`${contact.date}-${contact.email}-${contact.phone}`} contact={contact}/>))}


    </div>)
}
