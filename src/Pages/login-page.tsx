import './login-page.css'
import {useContext, useState} from "react";
import {LoginFormContext, MainContext, RegisterFormContext} from "../contexts";
import {ConfigInput} from "../components/config-input";
import {useLogin, useRegisterForm} from "../forms";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {useNavigate} from "react-router";
import Logo from "../assets/flexpayz-logo.svg";
import {toast} from "react-toastify";
export const notify = (message?: string) => toast(message, {
    position: "top-right",
    autoClose: 1500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
});


export function LoginPageWrapper() {
    const loginForm = useLogin()
    const registerForm = useRegisterForm()

    return (<LoginFormContext.Provider value={loginForm}>
        <RegisterFormContext.Provider value={registerForm}>
            <LoginPage/>
        </RegisterFormContext.Provider>
    </LoginFormContext.Provider>)
}

export function LoginPage() {
    const [hasAccount, setHasAccount] = useState(true)
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const {state, setState} = useContext(MainContext)
    const {db} = useContext(MainContext)
    const {email: emailLog, password: passwordLog} = useContext(LoginFormContext)
    const {email, password, confirmPassword, country} = useContext(RegisterFormContext)
    const navigate = useNavigate()


    const isLoginDisabled = state.invalidFields.has('emailLog') || state.invalidFields.has('passwordLog')
    const isRegisterDisabled = state.invalidFields.has('email') || state.invalidFields.has('password') || state.invalidFields.has('confirmPassword') || state.invalidFields.has('country') || !acceptedTerms

    const registerUser = () => {
        const auth = getAuth();
        createUserWithEmailAndPassword(auth, email.value, password.value)
            .then(async (userCredential) => {
                const newDoc = await setDoc(doc(db, 'users', userCredential.user.uid), {
                    country: country.value,
                    products: []
                })
                navigate('/manage-devices')
            })
            .catch((error) => {
                console.log(error.code)
                notify(ErrorCodes.get(error.code))
            });

    }

    const resetPassword = () => {
        const auth = getAuth()
        sendPasswordResetEmail(auth, emailLog.value)
            .then(() => {
                notify('Reset password email has been sent')
            })
            .catch((error) => {
                notify(ErrorCodes.get(error.code))
            });

    }

    const ErrorCodes = new Map([
        ['auth/wrong-password', 'Wrong password'],
        ['auth/user-not-found', 'User not found'],
        ['auth/invalid-email', 'Invalid email'],
        ['auth/weak-password', 'Password should be at least 6 characters'],
        ['auth/email-already-in-use', 'Email already used'],
        ['auth/missing-email', 'Invalid email']
    ])

    const logInUser = () => {
        const auth = getAuth();
        signInWithEmailAndPassword(auth, emailLog.value, passwordLog.value)
            .then((userCredential) => {
                // Signed in
                const user = userCredential.user;
                setState((prev: any) => ({...prev, userId: userCredential.user.uid}))
                navigate('/manage-devices')
            })
            .catch((error) => {
                console.log(error.code)
                notify(ErrorCodes.get(error.code))
            });

    }
    return (<div className={"page-login"}>
        {hasAccount && <div className={"modal-login"}>
            <div>
            <img src={Logo} alt={'logo'} className={'flexpayz-logo'}/>
            <a className={'how-to-text'} href={'https://www.flexpayz.se/pages/get-started'}>How-to-use guide</a>

            </div>
            <ConfigInput label={"Email"} value={emailLog.value} onChange={emailLog.onChange}
                         error={emailLog.error}></ConfigInput>
            <ConfigInput label={'Password'} type={'password'} value={passwordLog.value} onChange={passwordLog.onChange}
                         error={passwordLog.error}></ConfigInput>
            <button className={'button-login'} onClick={logInUser} disabled={isLoginDisabled}>Log in</button>
            <div className={'no-account'} onClick={() => {
                setHasAccount(false)
            }}>If you are not registered Sign up
            </div>
            <div onClick={resetPassword} className={'no-account'}> Forgot password?</div>
        </div>}
        {!hasAccount && <div className={"modal-login"}>
            <img src={Logo} alt={'logo'} className={'flexpayz-logo'}/>
            <ConfigInput label={"Email"} value={email.value} onChange={email.onChange}
                         error={email.error}></ConfigInput>
            <ConfigInput label={"Password"} type={'password'} value={password.value} onChange={password.onChange}
                         error={password.error}></ConfigInput>
            <ConfigInput label={"Confirm Password"} type={'password'} value={confirmPassword.value} onChange={confirmPassword.onChange}
                         error={confirmPassword.error}></ConfigInput>
            <ConfigInput label={"Country"} value={country.value} onChange={country.onChange}
                         error={country.error}></ConfigInput>
            {/*<heckbox checked={acceptedTerms} onChange={() => {*/}
            {/*    setAcceptedTerms((prev: boolean) => !prev)}>*/}
            <div>
                <input type={'checkbox'} checked={acceptedTerms} onChange={() => {
                    setAcceptedTerms((prev: boolean) => !prev)
                }}/>
                <span className={'terms-text'}>I accept Flex Payz Terms of Service</span>
            </div>
            <button className={'button-signup'} onClick={registerUser} disabled={isRegisterDisabled}>Sign in</button>
            <div className={'no-account'} onClick={() => {
                setHasAccount(true)
            }}>Already have an account?
            </div>
        </div>}


    </div>)
}
