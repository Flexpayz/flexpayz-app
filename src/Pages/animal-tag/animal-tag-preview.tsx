import "./preview-styles.css"
import {useContext, useEffect} from "react";
import {AnimalTagInformationContext, AnimalTagInformationContextProvider} from "./useAnimalTagInformation";
import {ProfilePicturePreview} from "../../components/home-baby-journal-preview";
import {addDoc, collection} from "firebase/firestore";
import {db} from "../../App";
import {DB_COLLECTIONS} from "../../components/baby-journal-settings";
import {notify} from "../login-page";

export function AnimalTagPreview() {
    const {state} = useContext(AnimalTagInformationContext)
    const {photo, name, gender, breed, age, ownerMessage, contact, weight, height, color, isLost} = state
    const onSendLocation = async () => {
        let locationLink = ""
        const success = async (position: any) => {
            locationLink = "https://maps.google.com/?q=" + position.coords.latitude + "," + position.coords.longitude

            await addDoc(collection(db, DB_COLLECTIONS.MAIL), {
                to: contact.email,
                message: {
                    subject: `${name} was found by Flexpayz!`,
                    text: "Here is the location of your pet: " + locationLink,
                },
            })
            console.log("MAIL SENT")
            notify("Location sent")
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
        const foundMessage = `Hello, I found ${name}. ${locationLink ? "Here is the location: " + locationLink : "Please contact me for the location"}`

        window.open(`sms:+${contact.phone}?body=${foundMessage}`)
    }



    return <div className={"animal-tag-preview"}>
        <div className={"frame"}>
            <ProfilePicturePreview asset={photo[0]}/>
            <div className={"name-container"}>
                <div className={"name"}>{name}</div>
                <div className={"breed"}>{breed} * {age}</div>
            </div>
        </div>
        <div className={"info"}>
            <h3>About {name}</h3>
            <div className={"info-line"}>
                <div className={"info-box"}>
                    <h6>Weight</h6>
                    <h3>{weight}</h3>
                </div>
                <div className={"info-box"}>
                    <h6>Height</h6>
                    <h3>{height}</h3>
                </div>
                <div className={"info-box"}>
                    <h6>Color</h6>
                    <h3>{color}</h3>
                </div>
            </div>
            <h3>Owner's note</h3>
            <div className={"note"}>
                <p>{ownerMessage}</p>
            </div>
            {isLost && <div>
                <h3>Contact</h3>
                <div className={"contact-wrapper"}>
                    <div className={"left-box"}>
                        <h4>{contact.name}</h4>
                        <h6>{contact.address}</h6>
                    </div>
                    <div className={"right-box"}>
                        <a style={{textDecoration: "none"}} href={`tel:+${contact.phone}`}>
                            <div className={"call-button"}>CALL</div>
                        </a>
                        <div className={"call-button"} onClick={onSendSMS}>SMS</div>
                    </div>
                </div>
            </div>}
        </div>
        {isLost && contact.email &&
            <div className={"send-location-button"} onClick={onSendLocation}>Send location</div>}
    </div>
}

export function AnimalTagPreviewWrapper() {
    return <AnimalTagInformationContextProvider>
        <AnimalTagPreview/>
    </AnimalTagInformationContextProvider>
}