import {ConfigInput} from "../components/config-input";
import {Button} from "@mui/material";
import {useNavigate} from "react-router";
import './initial-page.css'
import {FlexPayzLogo} from "../components/design-system/FlexPayzLogo";

export function InitialPage () {
    const navigate = useNavigate()
    return (<div className={"page-initial"}>
        <div className={"modal-initial"}>
            <FlexPayzLogo className={'flexpayz-logo'}/>
            <div className={'buttons-container'}>
                <button className={'website-button'} onClick={()=> {navigate('/admin')}}>Payment's Wearable</button>
                <button className={'app-button'} onClick={()=> {navigate('/app')}}>Business Cards & Smart Gifts</button>
            </div>
        </div>


    </div>)
}
