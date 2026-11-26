import {useNavigate} from "react-router";
import './initial-page.css'
import {FlexPayzLogo} from "../components/design-system/FlexPayzLogo";

export function InitialPage () {
    const navigate = useNavigate()
    return (<div className={"page-initial"}>
        <div className={"modal-initial"}>
            <FlexPayzLogo className={'flexpayz-logo'}/>
            <div className={'buttons-container'}>
            <button className={'website-button'} onClick={()=> { window.location.replace('https://www.flexpayz.se')}}>Webshop</button>
            <button className={'app-button'} onClick={()=> {navigate('/app')}}>Device Manager</button>
            </div>
        </div>


    </div>)
}
