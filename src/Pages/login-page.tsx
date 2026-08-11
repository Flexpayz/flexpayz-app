import './login-page.css'
import './auth-page.css'
import {
    Alert,
    Box,
    Checkbox,
    CircularProgress,
    Collapse,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {FormEvent, ReactNode, Ref, RefObject, useContext, useEffect, useMemo, useRef, useState} from "react";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "firebase/auth";
import {useNavigate} from "react-router";
import {toast} from "react-toastify";
import {MainContext} from "../contexts";
import {AppButton} from "../components/design-system/AppButton";
import {BackButton} from "../components/design-system/BackButton";
import {FlexPayzLogo} from "../components/design-system/FlexPayzLogo";
import {PageShell} from "../components/design-system/PageShell";
import {Surface} from "../components/design-system/Surface";
import {createUserProfile} from "../firestore/repositories/users";

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

type AuthView = 'login' | 'register' | 'forgot' | 'sent';
type AuthDirection = 'initial' | 'forward' | 'back' | 'inward';
type FieldErrors = Record<string, string>;

const TERMS_URL = 'https://www.flexpayz.se/pages/terms-of-service';
const PRIVACY_URL = 'https://www.flexpayz.se/pages/privacy-policy';
const RESEND_COOLDOWN_SECONDS = 45;

const firebaseErrorMessages = new Map([
    ['auth/wrong-password', 'Incorrect email or password.'],
    ['auth/user-not-found', 'Incorrect email or password.'],
    ['auth/invalid-credential', 'Incorrect email or password.'],
    ['auth/invalid-email', 'Enter a valid email address.'],
    ['auth/weak-password', 'Use a stronger password.'],
    ['auth/email-already-in-use', 'Email already registered.'],
    ['auth/missing-email', 'Enter a valid email address.'],
    ['auth/network-request-failed', 'Network unavailable. Please try again.'],
    ['auth/too-many-requests', 'Too many attempts. Please wait and try again.'],
]);

export function LoginPageWrapper() {
    return <LoginPage/>
}

export function LoginPage() {
    const [view, setView] = useState<AuthView>('login');
    const [direction, setDirection] = useState<AuthDirection>('initial');
    const [resetEmail, setResetEmail] = useState('');

    const transitionTo = (nextView: AuthView, nextDirection: AuthDirection) => {
        setDirection(nextDirection);
        setView(nextView);
    };

    return (
        <AuthShell view={view} direction={direction} onBack={() => transitionTo('login', 'back')}>
            {view === 'login' && (
                <LoginForm
                    onRegister={() => transitionTo('register', 'forward')}
                    onForgotPassword={() => transitionTo('forgot', 'inward')}
                />
            )}
            {view === 'register' && (
                <RegisterForm onLogin={() => transitionTo('login', 'back')}/>
            )}
            {view === 'forgot' && (
                <ForgotPasswordForm
                    onLogin={() => transitionTo('login', 'back')}
                    onSent={(email) => {
                        setResetEmail(email);
                        transitionTo('sent', 'forward');
                    }}
                />
            )}
            {view === 'sent' && (
                <PasswordResetSent
                    email={resetEmail}
                    onLogin={() => transitionTo('login', 'back')}
                    onDifferentEmail={() => transitionTo('forgot', 'back')}
                />
            )}
        </AuthShell>
    );
}

function AuthShell({
    children,
    view,
    direction,
    onBack,
}: {
    children: ReactNode;
    view: AuthView;
    direction: AuthDirection;
    onBack: () => void;
}) {
    const navigate = useNavigate();
    const isLogin = view === 'login';
    const isSent = view === 'sent';
    const panel = getBrandPanelCopy(view);
    const shellHeadingRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        shellHeadingRef.current?.focus();
    }, [view]);

    return (
        <PageShell bleed className="auth-page-shell" sx={{py: 0}}>
            <Box className={`auth-page auth-page-${view}`}>
                <Box className="auth-decor auth-decor-top" aria-hidden="true"/>
                <Box className="auth-decor auth-decor-bottom" aria-hidden="true"/>
                <Box className="auth-container">
                    <Box component="header" className="auth-mobile-header">
                        <FlexPayzLogo className="auth-logo"/>
                        {isLogin ? (
                            <button
                                type="button"
                                className="auth-round-control"
                                aria-label="Close authentication"
                                onClick={() => navigate('/')}
                            >
                                <CloseRoundedIcon fontSize="small" aria-hidden="true"/>
                            </button>
                        ) : (
                            <BackButton aria-label="Return to sign in" onClick={onBack}/>
                        )}
                    </Box>

                    <Surface className="auth-card">
                        <AuthBrandPanel panel={panel} isSent={isSent}/>
                        <Box component="main" className="auth-form-panel">
                            <Box
                                key={view}
                                ref={shellHeadingRef}
                                tabIndex={-1}
                                className={`auth-transition auth-transition-${direction}`}
                            >
                                {children}
                            </Box>
                        </Box>
                    </Surface>
                </Box>
            </Box>
        </PageShell>
    );
}

function AuthBrandPanel({panel, isSent}: {panel: ReturnType<typeof getBrandPanelCopy>; isSent: boolean}) {
    return (
        <Box component="aside" className="auth-brand-panel" aria-label="FlexPayz device manager">
            <FlexPayzLogo className="auth-logo auth-brand-logo"/>
            <Box className="auth-brand-copy">
                <Box component="p" className="auth-kicker">{panel.kicker}</Box>
                <Box component="h2" className="auth-brand-heading">
                    {panel.heading}
                    {panel.emphasis && <span>{panel.emphasis}</span>}
                </Box>
                <Box component="p" className="auth-brand-description">{panel.description}</Box>
            </Box>
            {isSent ? <EnvelopeVisual/> : <ProductVisual/>}
            <Box component="p" className="auth-brand-note">{panel.note}</Box>
        </Box>
    );
}

function LoginForm({onRegister, onForgotPassword}: {onRegister: () => void; onForgotPassword: () => void}) {
    const {setState} = useContext(MainContext);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (loading) return;

        const validation = validateLogin(email, password);
        setErrors(validation);
        setFormError('');
        if (focusFirstInvalid(validation, {email: emailRef, password: passwordRef})) return;

        setLoading(true);
        try {
            const auth = getAuth();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            setState((prev: any) => ({...prev, userId: userCredential.user.uid}));
            navigate('/manage-devices');
        } catch (error: any) {
            setFormError(getFirebaseMessage(error?.code, 'Sign in is temporarily unavailable.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthFormFrame kicker="DEVICE MANAGER" heading="Welcome back." description="Sign in to manage your FlexPayz products and keep everything you share up to date.">
            <Box component="form" className="auth-form" onSubmit={submit} noValidate>
                <FormError message={formError}/>
                <AuthTextField
                    label="Email address"
                    value={email}
                    onChange={(value) => setEmail(value)}
                    error={errors.email}
                    inputRef={emailRef}
                    autoComplete="email"
                    type="email"
                />
                <PasswordField
                    label="Password"
                    value={password}
                    onChange={(value) => setPassword(value)}
                    error={errors.password}
                    inputRef={passwordRef}
                    autoComplete="current-password"
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((shown) => !shown)}
                    extraLabelAction={<button type="button" className="auth-text-button" onClick={onForgotPassword}>Forgot password?</button>}
                />
                <PrimarySubmit loading={loading}>Sign in</PrimarySubmit>
                <CalloutAction title="New to FlexPayz?" description="Create an account and activate your first device." action="Create an account" onClick={onRegister}/>
            </Box>
        </AuthFormFrame>
    );
}

function RegisterForm({onLogin}: {onLogin: () => void}) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [country, setCountry] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLInputElement>(null);
    const countryRef = useRef<HTMLInputElement>(null);

    const strength = getPasswordStrength(password);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (loading) return;

        const validation = validateRegister(email, password, confirmPassword, country, acceptedTerms);
        setErrors(validation);
        setFormError('');
        if (focusFirstInvalid(validation, {email: emailRef, password: passwordRef, confirmPassword: confirmRef, country: countryRef})) return;

        setLoading(true);
        try {
            const auth = getAuth();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await createUserProfile(userCredential.user.uid, {
                country,
                products: []
            });
            navigate('/manage-devices');
        } catch (error: any) {
            setFormError(getFirebaseMessage(error?.code, 'Account creation is temporarily unavailable.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthFormFrame kicker="DEVICE MANAGER" heading="Create your account." description="Set up your FlexPayz account. You can activate and personalize your products right after.">
            <Box component="form" className="auth-form" onSubmit={submit} noValidate>
                <FormError message={formError}/>
                <AuthTextField
                    label="Email address"
                    value={email}
                    onChange={(value) => setEmail(value)}
                    error={errors.email}
                    inputRef={emailRef}
                    autoComplete="email"
                    type="email"
                />
                <PasswordField
                    label="Password"
                    value={password}
                    onChange={(value) => setPassword(value)}
                    error={errors.password}
                    inputRef={passwordRef}
                    autoComplete="new-password"
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((shown) => !shown)}
                />
                <PasswordStrength strength={strength}/>
                <PasswordField
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={(value) => setConfirmPassword(value)}
                    error={errors.confirmPassword}
                    inputRef={confirmRef}
                    autoComplete="new-password"
                    showPassword={showConfirmPassword}
                    onTogglePassword={() => setShowConfirmPassword((shown) => !shown)}
                />
                <AuthTextField
                    label="Country"
                    value={country}
                    onChange={(value) => setCountry(value)}
                    error={errors.country}
                    inputRef={countryRef}
                    autoComplete="country-name"
                />
                <Box className="auth-terms">
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={acceptedTerms}
                                onChange={(event) => setAcceptedTerms(event.target.checked)}
                                inputProps={{'aria-describedby': errors.terms ? 'terms-error' : undefined}}
                            />
                        }
                        label={
                            <span>
                                I agree to the <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                            </span>
                        }
                    />
                    <Collapse in={Boolean(errors.terms)}>
                        <Box id="terms-error" className="auth-field-error" role="alert">{errors.terms}</Box>
                    </Collapse>
                </Box>
                <PrimarySubmit loading={loading}>Create account</PrimarySubmit>
                <Box className="auth-switch-row">Already registered? <button type="button" className="auth-text-button" onClick={onLogin}>Sign in instead</button></Box>
            </Box>
        </AuthFormFrame>
    );
}

function ForgotPasswordForm({onLogin, onSent}: {onLogin: () => void; onSent: (email: string) => void}) {
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const emailRef = useRef<HTMLInputElement>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (loading) return;

        const validation = validateForgot(email);
        setErrors(validation);
        setFormError('');
        if (focusFirstInvalid(validation, {email: emailRef})) return;

        setLoading(true);
        try {
            await sendPasswordResetEmail(getAuth(), email);
            onSent(email);
        } catch (error: any) {
            setFormError(getFirebaseMessage(error?.code, 'Password-reset request is temporarily unavailable.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthFormFrame kicker="PASSWORD RECOVERY" heading="Reset your password." description="Enter the email address connected to your account. We’ll send you a secure reset link.">
            <Box component="form" className="auth-form" onSubmit={submit} noValidate>
                <FormError message={formError}/>
                <AuthTextField
                    label="Email address"
                    value={email}
                    onChange={(value) => setEmail(value)}
                    error={errors.email}
                    inputRef={emailRef}
                    autoComplete="email"
                    type="email"
                />
                <PrimarySubmit loading={loading}>Send reset link</PrimarySubmit>
                <Box className="auth-switch-row">Remembered your password? <button type="button" className="auth-text-button" onClick={onLogin}>Return to sign in</button></Box>
                <SecurityCard/>
            </Box>
        </AuthFormFrame>
    );
}

function PasswordResetSent({email, onLogin, onDifferentEmail}: {email: string; onLogin: () => void; onDifferentEmail: () => void}) {
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [liveMessage, setLiveMessage] = useState('Password reset email sent.');
    const maskedEmail = useMemo(() => maskEmail(email), [email]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [cooldown]);

    const resend = async () => {
        if (cooldown > 0 || loading) return;
        setLoading(true);
        setFormError('');
        try {
            await sendPasswordResetEmail(getAuth(), email);
            setCooldown(RESEND_COOLDOWN_SECONDS);
            setLiveMessage('Password reset email resent.');
        } catch (error: any) {
            setFormError(getFirebaseMessage(error?.code, 'Password-reset request is temporarily unavailable.'));
            setLiveMessage('Password reset email could not be resent.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthFormFrame kicker="EMAIL SENT" heading="Check your inbox." description={`We sent a password reset link to ${maskedEmail}.`} success>
            <Box className="auth-form" aria-live="polite">
                <span className="auth-live-region">{liveMessage}</span>
                <FormError message={formError}/>
                <Box className="auth-success-icon" aria-hidden="true">
                    <EmailOutlinedIcon/>
                    <span><CheckRoundedIcon fontSize="small"/></span>
                </Box>
                <Box component="p" className="auth-sent-security">The link will expire for your security.</Box>
                <AppButton type="button" variant="contained" className="auth-primary-button" onClick={onLogin} endIcon={<ArrowForwardRoundedIcon aria-hidden="true"/>}>
                    Return to sign in
                </AppButton>
                <AppButton
                    type="button"
                    variant="outlined"
                    className="auth-secondary-button auth-resend-button"
                    disabled={cooldown > 0 || loading}
                    onClick={resend}
                >
                    <span>Resend email</span>
                    <span aria-label={cooldown > 0 ? `${cooldown} seconds remaining` : undefined}>{loading ? <CircularProgress size={18} color="inherit"/> : cooldown > 0 ? formatCooldown(cooldown) : 'Ready'}</span>
                </AppButton>
                <button type="button" className="auth-text-button auth-centered-link" onClick={onDifferentEmail}>Use a different email address</button>
                <Box className="auth-help-card">
                    <strong>Can’t find the email?</strong>
                    <ul>
                        <li>Check your spam or promotions folder</li>
                        <li>Make sure the email address is correct</li>
                        <li>Wait a minute before requesting another link</li>
                    </ul>
                </Box>
            </Box>
        </AuthFormFrame>
    );
}

function AuthFormFrame({
    kicker,
    heading,
    description,
    children,
    success = false,
}: {
    kicker: string;
    heading: string;
    description: string;
    children: ReactNode;
    success?: boolean;
}) {
    return (
        <Stack className={`auth-form-frame ${success ? 'auth-form-frame-success' : ''}`}>
            <Box component="p" className="auth-kicker">{kicker}</Box>
            <Box component="h1" className="auth-heading">{heading}</Box>
            <Box component="p" className="auth-description">{description}</Box>
            {children}
            <Box component="footer" className="auth-footer">SECURE · CONTACTLESS · YOURS</Box>
        </Stack>
    );
}

function AuthTextField({
    label,
    value,
    onChange,
    error,
    inputRef,
    autoComplete,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    inputRef?: Ref<HTMLInputElement>;
    autoComplete?: string;
    type?: string;
}) {
    const id = fieldId(label);

    return (
        <TextField
            id={id}
            className="auth-input"
            label={label}
            value={value}
            inputRef={inputRef}
            onChange={(event) => onChange(event.target.value)}
            error={Boolean(error)}
            helperText={error || ' '}
            FormHelperTextProps={{id: `${id}-error`}}
            inputProps={{'aria-describedby': error ? `${id}-error` : undefined}}
            autoComplete={autoComplete}
            type={type}
            fullWidth
        />
    );
}

function PasswordField({
    label,
    value,
    onChange,
    error,
    inputRef,
    autoComplete,
    showPassword,
    onTogglePassword,
    extraLabelAction,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    inputRef?: Ref<HTMLInputElement>;
    autoComplete: string;
    showPassword: boolean;
    onTogglePassword: () => void;
    extraLabelAction?: ReactNode;
}) {
    const id = fieldId(label);

    return (
        <Box className="auth-password-field">
            {extraLabelAction && <Box className="auth-label-action">{extraLabelAction}</Box>}
            <TextField
                id={id}
                className="auth-input"
                label={label}
                value={value}
                inputRef={inputRef}
                onChange={(event) => onChange(event.target.value)}
                error={Boolean(error)}
                helperText={error || ' '}
                FormHelperTextProps={{id: `${id}-error`}}
                inputProps={{'aria-describedby': error ? `${id}-error` : undefined}}
                autoComplete={autoComplete}
                type={showPassword ? 'text' : 'password'}
                fullWidth
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                type="button"
                                edge="end"
                                aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                                aria-pressed={showPassword}
                                onClick={onTogglePassword}
                            >
                                {showPassword ? <VisibilityOffOutlinedIcon/> : <VisibilityOutlinedIcon/>}
                            </IconButton>
                        </InputAdornment>
                    )
                }}
            />
        </Box>
    );
}

function PasswordStrength({strength}: {strength: ReturnType<typeof getPasswordStrength>}) {
    return (
        <Box className="auth-strength" aria-label={`Password strength: ${strength.label}`}>
            <Box className="auth-strength-track">
                <span style={{transform: `scaleX(${strength.score / 4})`}}/>
            </Box>
            <Box className="auth-strength-copy">{strength.guidance}</Box>
        </Box>
    );
}

function PrimarySubmit({children, loading}: {children: ReactNode; loading: boolean}) {
    return (
        <AppButton
            type="submit"
            variant="contained"
            className="auth-primary-button"
            disabled={loading}
            endIcon={loading ? <CircularProgress size={18} color="inherit" aria-label="Loading"/> : <ArrowForwardRoundedIcon aria-hidden="true"/>}
        >
            {children}
        </AppButton>
    );
}

function FormError({message}: {message: string}) {
    return (
        <Collapse in={Boolean(message)}>
            <Alert severity="error" className="auth-error-summary" role="alert">{message}</Alert>
        </Collapse>
    );
}

function CalloutAction({
    title,
    description,
    action,
    onClick,
}: {
    title: string;
    description: string;
    action: string;
    onClick: () => void;
}) {
    return (
        <button type="button" className="auth-callout" onClick={onClick}>
            <strong>{title}</strong>
            <span>{description}</span>
            <b>{action} →</b>
        </button>
    );
}

function SecurityCard() {
    return (
        <Box className="auth-security-card">
            <span aria-hidden="true"><LockOutlinedIcon fontSize="small"/></span>
            <Box>
                <strong>Your security matters</strong>
                <p>FlexPayz will never ask for your password by email. Reset links expire automatically.</p>
            </Box>
        </Box>
    );
}

function ProductVisual() {
    return (
        <Box className="auth-product-visual entry-product-visual" aria-hidden="true">
            <Box className="entry-product-ring"/>
            <Box className="entry-product-shine"/>
        </Box>
    );
}

function EnvelopeVisual() {
    return (
        <Box className="auth-envelope-visual" aria-hidden="true">
            <EmailOutlinedIcon/>
            <span><CheckRoundedIcon fontSize="small"/></span>
        </Box>
    );
}

function validateLogin(email: string, password: string) {
    const errors: FieldErrors = {};
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Enter your password.';
    return errors;
}

function validateRegister(email: string, password: string, confirmPassword: string, country: string, acceptedTerms: boolean) {
    const errors: FieldErrors = {};
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
    if (password.length < 6) errors.password = 'Use at least 6 characters.';
    if (confirmPassword !== password) errors.confirmPassword = 'Passwords must match.';
    if (!country.trim()) errors.country = 'Select your country.';
    if (!acceptedTerms) errors.terms = 'Accept the Terms of Service and Privacy Policy.';
    return errors;
}

function validateForgot(email: string) {
    const errors: FieldErrors = {};
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
    return errors;
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(password: string) {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d|[^A-Za-z]/.test(password)) score += 1;

    if (!password) return {score: 0, label: 'empty', guidance: 'Use at least 6 characters.'};
    if (score <= 1) return {score, label: 'basic', guidance: 'Meets minimum once it has 6 characters.'};
    if (score <= 3) return {score, label: 'good', guidance: 'Good. Add numbers or symbols for extra strength.'};
    return {score, label: 'strong', guidance: 'Strong password.'};
}

function focusFirstInvalid(errors: FieldErrors, refs: Record<string, RefObject<HTMLInputElement>>) {
    const firstInvalid = Object.keys(errors)[0];
    if (!firstInvalid) return false;
    refs[firstInvalid]?.current?.focus();
    return true;
}

function getFirebaseMessage(code: string | undefined, fallback: string) {
    return (code && firebaseErrorMessages.get(code)) || fallback;
}

function maskEmail(email: string) {
    const [local = '', domain = ''] = email.split('@');
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible || '••'}••••@${domain}`;
}

function formatCooldown(seconds: number) {
    return `00:${String(seconds).padStart(2, '0')}`;
}

function fieldId(label: string) {
    return `auth-${label.toLowerCase().replace(/\s+/g, '-')}`;
}

function getBrandPanelCopy(view: AuthView) {
    if (view === 'register') {
        return {
            kicker: 'START YOUR FLEXPAYZ JOURNEY',
            heading: 'One account.',
            emphasis: 'Every product.',
            description: 'Activate new products, change what they share and manage everything from one place.',
            note: 'One account. Every FlexPayz product.',
        };
    }
    if (view === 'forgot') {
        return {
            kicker: 'SECURE ACCOUNT RECOVERY',
            heading: 'A simple way back.',
            emphasis: '',
            description: 'Receive a secure link and choose a new password. Your products and settings remain unchanged.',
            note: 'Secure · Private · Yours',
        };
    }
    if (view === 'sent') {
        return {
            kicker: 'SECURE ACCOUNT RECOVERY',
            heading: 'Your secure link is on its way.',
            emphasis: '',
            description: 'Use the email we sent to choose a new password and return to your products.',
            note: 'Your secure link is on its way.',
        };
    }
    return {
        kicker: 'YOUR PRODUCTS. YOUR CONTROL.',
        heading: 'Welcome back.',
        emphasis: '',
        description: 'Manage your devices and keep everything you share accurate and up to date.',
        note: 'Secure · Contactless · Yours',
    };
}
