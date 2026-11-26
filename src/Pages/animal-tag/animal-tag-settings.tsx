import React, {useContext, useState} from "react";
import {LoadingScreen, LoadingScreenContext} from "../../components/loading-sreen";
import {AnimalTagInformationContext, AnimalTagInformationContextProvider} from "./useAnimalTagInformation";
import {AnimalTagHandlerContext, AnimalTagHandlerContextProvider, useAnimalTagHandler} from "./useAnimalTagHandler";
import {SaveButton} from "./save-button";
import {DB_COLLECTIONS, DB_STORAGE} from "../../components/baby-journal-settings";
import "./styles.css"
import {onChangeWrapper} from "../../utils";
import {InputLabel, Switch, TextField} from "@mui/material";
import ReactPhoneInput from 'react-phone-input-material-ui';
import {ProfileUpload} from "../../components/profile-upload";
import {Navbar} from "./navbar";

export function AnimalTagSettingsWrapper() {
    const [isLoading, setIsLoading] = useState(false)
    return <div style={{position: "relative", maxWidth: "1000px", margin: "0 auto"}}>
        <LoadingScreenContext.Provider value={{isLoading, setIsLoading}}>
            <AnimalTagInformationContextProvider>
                <AnimalTagHandlerContextProvider>
                    {isLoading && <LoadingScreen/>}
                    <Navbar/>
                    <AnimalTagSettings/>
                    <AnimalTagSaveButton/>
                </AnimalTagHandlerContextProvider>
            </AnimalTagInformationContextProvider>
        </LoadingScreenContext.Provider>
    </div>
}

function AnimalTagSettings() {
    const {
        name,
        age,
        breed,
        color,
        height,
        weight,
        ownerMessage,
        contact,
        photo,
        gender,
        isLost
    } = useContext(AnimalTagHandlerContext)!
    return <div className={"settings-box"}>
        <h1>About</h1>
        <ProfileUpload value={photo.value} onChange={photo.onChange}
                       storageFolder={DB_STORAGE.ANIMAL_TAG}
                       shape="square"
                       label="Animal photo"/>
        <InputLabel>Is your animal lost?</InputLabel>
        <Switch checked={isLost.value} onChange={(event, checked) => isLost.onChange(checked)}/>
        <TextField label={'Name'} placeholder={"Name"} value={name.value} className={"textfield"}
                   onChange={onChangeWrapper(name)} variant={"outlined"} size={"small"}/>
        <TextField label={'Age'} placeholder={"Age"} value={age.value} className={"textfield"}
                   onChange={onChangeWrapper(age)} variant={"outlined"} size={"small"}/>
        <TextField label={'Breed'} placeholder={"Breed"} value={breed.value} className={"textfield"}
                   onChange={onChangeWrapper(breed)} variant={"outlined"} size={"small"}/>
        <TextField label={'Color'} placeholder={"Color"} value={color.value} className={"textfield"}
                   onChange={onChangeWrapper(color)} variant={"outlined"} size={"small"}/>
        <TextField label={'Height'} placeholder={"Height"} value={height.value} className={"textfield"}
                   onChange={onChangeWrapper(height)} variant={"outlined"} size={"small"}/>
        <TextField label={'Weight'} placeholder={"Weight"} value={weight.value} className={"textfield"}
                   onChange={onChangeWrapper(weight)} variant={"outlined"} size={"small"}/>
        <TextField label={'Owner Message'} placeholder={"Owner Message"} value={ownerMessage.value}
                   className={"textfield"} onChange={onChangeWrapper(ownerMessage)} variant={"outlined"}
                   size={"small"} multiline minRows={3} maxRows={7}/>

        <h1>Contact</h1>
        <TextField label={'Name'} placeholder={"Name"} value={contact.name.value} className={"textfield"}
                   onChange={onChangeWrapper(contact.name)} variant={"outlined"} size={"small"}/>
        <ReactPhoneInput enableAreaCodes country={"gb"} value={contact.phone.value}
                         onChange={contact.phone.onChange} component={TextField} containerClass={"textfield"}
                         inputProps={{size: "small"}}/>
        <TextField label={'Address'} placeholder={"Address"} value={contact.address.value} className={"textfield"}
                   onChange={onChangeWrapper(contact.address)} variant={"outlined"} size={"small"}/>
        <TextField label={'Email'} placeholder={"Email"} value={contact.email.value} className={"textfield"}
                   onChange={onChangeWrapper(contact.email)} variant={"outlined"} size={"small"}/>
    </div>
}

function AnimalTagSaveButton() {
    const {state, setOriginalState} = useContext(AnimalTagInformationContext)
    return <SaveButton state={state} setOriginalState={setOriginalState} collection={DB_COLLECTIONS.ANIMAL_TAG}/>
}

