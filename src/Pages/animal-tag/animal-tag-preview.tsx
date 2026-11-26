import "./preview-styles.css"
import {useContext} from "react";
import {AnimalTagInformationContext, AnimalTagInformationContextProvider} from "./useAnimalTagInformation";
import {ProfilePicturePreview} from "../../components/home-baby-journal-preview";
import {notify} from "../login-page";
import {PublicPageHeader} from "../../components/public-page-header";
import {usePublicLanguage} from "../../public-i18n";
import {enqueueMail} from "../../firestore/repositories/mail";

export function AnimalTagPreview() {
    const {state} = useContext(AnimalTagInformationContext)
    const {photo, name, breed, age, ownerMessage, contact, weight, height, color, isLost} = state
    const {t} = usePublicLanguage();
    const productId = new URLSearchParams(window.location.search).get("product_id") || "";
    const onSendLocation = async () => {
        let locationLink = ""
        const success = async (position: any) => {
            locationLink = "https://maps.google.com/?q=" + position.coords.latitude + "," + position.coords.longitude

            await enqueueMail({
                productId,
                to: contact.email,
                message: {
                    subject: t("animal.emailSubject", {name}),
                    text: t("animal.emailText", {location: locationLink}),
                },
            })
            console.log("MAIL SENT")
            notify(t("animal.locationSent"))
        }
        const error = (error: any) => {
        }
        navigator.geolocation.getCurrentPosition(success, error);
    }
    const onSendSMS = () => {
        let locationLink = ""
        const success = async (position: any) => {
            locationLink = "https://maps.google.com/?q=" + position.coords.latitude + "," + position.coords.longitude
        }
        const error = (error: any) => {
        }
        navigator.geolocation.getCurrentPosition(success, error);
        const foundMessage = t("animal.smsFound", {
            name,
            locationText: locationLink ? t("animal.smsLocation", {location: locationLink}) : t("animal.smsContact"),
        })

        window.open(`sms:+${contact.phone}?body=${foundMessage}`)
    }



    return <div className={"animal-tag-preview"}>
        <PublicPageHeader productId={productId} shareTitle={name || t("section.animalTag.title")}/>
        <div className={"frame"}>
            <ProfilePicturePreview asset={photo[0]}/>
            <div className={"name-container"}>
                <div className={"name"}>{name}</div>
                <div className={"breed"}>{breed} * {age}</div>
            </div>
        </div>
        <div className={"info"}>
            <h3>{t("animal.about", {name})}</h3>
            <div className={"info-line"}>
                <div className={"info-box"}>
                    <h6>{t("animal.weight")}</h6>
                    <h3>{weight}</h3>
                </div>
                <div className={"info-box"}>
                    <h6>{t("animal.height")}</h6>
                    <h3>{height}</h3>
                </div>
                <div className={"info-box"}>
                    <h6>{t("animal.color")}</h6>
                    <h3>{color}</h3>
                </div>
            </div>
            <h3>{t("animal.ownerNote")}</h3>
            <div className={"note"}>
                <p>{ownerMessage}</p>
            </div>
            {isLost && <div>
                <h3>{t("animal.contact")}</h3>
                <div className={"contact-wrapper"}>
                    <div className={"left-box"}>
                        <h4>{contact.name}</h4>
                        <h6>{contact.address}</h6>
                        </div>
                        <div className={"right-box"}>
                            <a style={{textDecoration: "none"}} href={`tel:+${contact.phone}`}>
                            <div className={"call-button"}>{t("animal.call")}</div>
                        </a>
                        <div className={"call-button"} onClick={onSendSMS}>{t("animal.sms")}</div>
                    </div>
                </div>
            </div>}
        </div>
        {isLost && contact.email &&
            <div className={"send-location-button"} onClick={onSendLocation}>{t("animal.sendLocation")}</div>}
    </div>
}

export function AnimalTagPreviewWrapper() {
    return <AnimalTagInformationContextProvider>
        <AnimalTagPreview/>
    </AnimalTagInformationContextProvider>
}
