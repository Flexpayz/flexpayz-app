import './manage-devices.css'
import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    InputAdornment,
    Menu,
    MenuItem,
    Stack,
    TextField,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {getAuth, onAuthStateChanged, signOut} from "firebase/auth";
import {FormEvent, KeyboardEvent, RefObject, useCallback, useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router";
import {AppButton} from "../components/design-system/AppButton";
import {FlexPayzLogo} from "../components/design-system/FlexPayzLogo";
import {BackButton} from "../components/design-system/BackButton";
import {LoadingPanel} from "../components/design-system/LoadingPanel";
import {PageShell} from "../components/design-system/PageShell";
import {Surface} from "../components/design-system/Surface";
import {findProductsByUnlockCode, getProductDocument, updateProduct} from "../firestore/repositories/products";
import {addProductToUser, getUserProfile} from "../firestore/repositories/users";
import type {Product} from "../control-state";

type DashboardMode = 'dashboard' | 'activate';
type WizardStep = 'code' | 'confirm' | 'success';
type WizardIssue = 'incomplete' | 'not-found' | 'already-activated' | 'activation-failed' | 'network' | 'permission' | null;

type ManagedDevice = {
    id: string;
    type?: string;
    productType?: string;
} & Product;

const SUPPORT_URL = 'https://www.flexpayz.se/pages/get-started';
const CODE_LENGTH = 6;

export function ManageDevices() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState('');
    const [devices, setDevices] = useState<ManagedDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [mode, setMode] = useState<DashboardMode>('dashboard');
    const [search, setSearch] = useState('');
    const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
    const [highlightedDeviceId, setHighlightedDeviceId] = useState('');

    useEffect(() => {
        const auth = getAuth();
        return onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                navigate('/app');
            }
        });
    }, [navigate]);

    const loadDevices = useCallback(async (keepExisting = false) => {
        if (!userId) return;
        if (keepExisting) {
            setRefreshing(true);
        } else {
            setLoading(true);
            setDevices([]);
        }
        setFetchError('');

        try {
            const user = await getUserProfile(userId);
            const productIds = user?.products || [];
            const productDocs = await Promise.all(
                productIds.map(async (id: string) => {
                    const product = await getProductDocument(id);
                    return product ? {id: product.id, ...product.data} : null;
                })
            );
            setDevices(productDocs.filter(Boolean) as ManagedDevice[]);
        } catch (error: any) {
            setFetchError(getDashboardError(error?.code));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    const onLogout = () => {
        const auth = getAuth();
        signOut(auth).then(() => {
            navigate('/app');
        }).catch((error) => {
            setFetchError(getDashboardError(error?.code));
        });
    };

    const onActivationComplete = (device: ManagedDevice) => {
        setDevices((currentDevices) => {
            const withoutExisting = currentDevices.filter((current) => current.id !== device.id);
            return [...withoutExisting, {...device, activated: true}];
        });
        setHighlightedDeviceId(device.id);
        setMode('dashboard');
    };

    if (mode === 'activate') {
        return (
            <ActivationWizard
                userId={userId}
                onCancel={() => setMode('dashboard')}
                onComplete={onActivationComplete}
            />
        );
    }

    const deviceCount = devices.length;
    const showDiscovery = deviceCount > 1;
    const filteredDevices = filterDevices(devices, search);
    const profileMenuOpen = Boolean(profileAnchor);

    return (
        <PageShell bleed className="devices-page-shell" sx={{py: 0}}>
            <Box className="devices-page">
                <Box className="devices-decor devices-decor-top" aria-hidden="true"/>
                <Box className="devices-decor devices-decor-bottom" aria-hidden="true"/>
                <Box className="devices-container">
                    <Box component="header" className="devices-header">
                        <FlexPayzLogo className="devices-logo"/>
                        <Stack direction="row" className="devices-header-actions">
                            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="devices-support-link">
                                Help & support
                            </a>
                            <button
                                type="button"
                                className={`devices-profile-button ${profileMenuOpen ? 'devices-profile-button-open' : ''}`}
                                aria-label="Open profile menu"
                                aria-haspopup="menu"
                                aria-expanded={profileMenuOpen}
                                onClick={(event) => setProfileAnchor(event.currentTarget)}
                            >
                                <PersonOutlineRoundedIcon aria-hidden="true"/>
                            </button>
                            <Menu
                                anchorEl={profileAnchor}
                                open={profileMenuOpen}
                                onClose={() => setProfileAnchor(null)}
                                className="devices-profile-menu"
                            >
                                <MenuItem onClick={() => {
                                    setProfileAnchor(null);
                                    onLogout();
                                }}>
                                    Logout
                                </MenuItem>
                            </Menu>
                        </Stack>
                    </Box>

                    <Box component="section" className="devices-main" aria-busy={loading || refreshing} aria-label="My devices content">
                        <span className="devices-live-region" aria-live="polite">
                            {loading ? 'Loading your devices.' : refreshing ? 'Refreshing your devices.' : ''}
                        </span>
                        <Box className="devices-title-row">
                            <Box>
                                <Box component="p" className="devices-kicker">DEVICE MANAGER</Box>
                                <Box component="h1" className="devices-heading">My devices</Box>
                                <Box component="p" className="devices-count">
                                    {loading ? 'Loading active products' : pluralizeDevices(deviceCount)}
                                </Box>
                            </Box>
                            <AppButton
                                type="button"
                                variant="contained"
                                className="devices-add-button"
                                onClick={() => setMode('activate')}
                                endIcon={<AddRoundedIcon aria-hidden="true"/>}
                            >
                                Add a device
                            </AppButton>
                        </Box>

                        {fetchError && (
                            <Surface className="devices-error-state" role="alert">
                                <strong>Couldn’t load your devices</strong>
                                <p>{fetchError}</p>
                                <AppButton type="button" variant="contained" className="devices-primary-button" onClick={() => loadDevices()}>
                                    Retry
                                </AppButton>
                            </Surface>
                        )}

                        {!fetchError && loading && <DashboardSkeleton/>}

                        {!fetchError && !loading && deviceCount === 0 && (
                            <EmptyDashboard onAddDevice={() => setMode('activate')}/>
                        )}

                        {!fetchError && !loading && deviceCount > 0 && (
                            <>
                                {showDiscovery && (
                                    <DashboardDiscovery
                                        search={search}
                                        onSearch={setSearch}
                                    />
                                )}
                                {filteredDevices.length === 0 ? (
                                    <NoResults onClear={() => {
                                        setSearch('');
                                    }}/>
                                ) : (
                                    <Box className="devices-grid">
                                        {filteredDevices.map((device, index) => (
                                            <DeviceCard
                                                key={device.id}
                                                device={device}
                                                index={index}
                                                highlighted={device.id === highlightedDeviceId}
                                                onManage={() => navigate(`/manage-device?product_id=${device.id}`)}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
            </Box>
        </PageShell>
    );
}

function EmptyDashboard({onAddDevice}: {onAddDevice: () => void}) {
    return (
        <Box className="devices-empty-grid">
            <Surface className="devices-empty-hero">
                <ProductVisual/>
                <Box component="h2">Your collection starts here.</Box>
                <Box component="p">Activate your first FlexPayz product using the code included in its packaging.</Box>
                <AppButton type="button" variant="contained" className="devices-primary-button" onClick={onAddDevice} endIcon={<ArrowForwardRoundedIcon aria-hidden="true"/>}>
                    Add your first device
                </AppButton>
                <button type="button" className="devices-text-button" onClick={openSupport}>
                    Where can I find my code?
                </button>
            </Surface>
            <Surface className="devices-help-card">
                <strong>Already have a FlexPayz product?</strong>
                <p>The six-character activation code is printed inside the product packaging.</p>
                <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">View activation guide</a>
            </Surface>
        </Box>
    );
}

function DashboardDiscovery({
    search,
    onSearch,
}: {
    search: string;
    onSearch: (value: string) => void;
}) {
    return (
        <Box className="devices-discovery">
            <TextField
                className="devices-search"
                label="Search your devices"
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                fullWidth
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchRoundedIcon aria-hidden="true"/>
                        </InputAdornment>
                    ),
                    endAdornment: search ? (
                        <InputAdornment position="end">
                            <IconButton aria-label="Clear search" onClick={() => onSearch('')}>
                                <CloseRoundedIcon/>
                            </IconButton>
                        </InputAdornment>
                    ) : undefined,
                }}
            />
        </Box>
    );
}

function DeviceCard({
    device,
    index,
    highlighted,
    onManage,
}: {
    device: ManagedDevice;
    index: number;
    highlighted: boolean;
    onManage: () => void;
}) {
    const category = getDeviceCategory(device);
    const contentType = getContentType(device);
    const status = getDeviceStatus(device);

    return (
        <Surface
            component="article"
            className={`devices-card ${highlighted ? 'devices-card-highlight' : ''}`}
            aria-label={`${getDeviceName(device)} device`}
            style={{'--device-card-delay': `${Math.min(index, 5) * 45}ms`} as any}
        >
            <Box className={`devices-card-visual devices-card-visual-${category.kind}`}>
                <ProductVisual variant={category.kind}/>
                <span className={`devices-status devices-status-${status.kind}`}><span aria-hidden="true"/>{status.label}</span>
            </Box>
            <Box className="devices-card-body">
                <Box className="devices-card-meta-row">
                    <Box component="p" className="devices-card-kicker">{category.label}</Box>
                </Box>
                <Box component="h2" className="devices-card-title">{getDeviceName(device)}</Box>
                {contentType && <span className="devices-content-pill">{contentType}</span>}
                <AppButton type="button" variant="contained" className="devices-card-action" onClick={onManage} endIcon={<ArrowForwardRoundedIcon aria-hidden="true"/>}>
                    Manage device
                </AppButton>
            </Box>
        </Surface>
    );
}

function getDeviceStatus(device: ManagedDevice) {
    if (device.inactive) {
        return {kind: 'inactive', label: 'Inactive'};
    }
    if (device.activated === false) {
        return {kind: 'setup', label: 'Setup needed'};
    }
    return {kind: 'active', label: 'Active'};
}

function ActivationWizard({
    userId,
    onCancel,
    onComplete,
}: {
    userId: string;
    onCancel: () => void;
    onComplete: (device: ManagedDevice) => void;
}) {
    const navigate = useNavigate();
    const [step, setStep] = useState<WizardStep>('code');
    const [direction, setDirection] = useState<'forward' | 'back' | 'initial'>('initial');
    const [code, setCode] = useState('');
    const [matchedDevice, setMatchedDevice] = useState<ManagedDevice | null>(null);
    const [issue, setIssue] = useState<WizardIssue>(null);
    const [loading, setLoading] = useState(false);
    const [activationLoading, setActivationLoading] = useState(false);
    const [liveMessage, setLiveMessage] = useState('');
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, [step, issue]);

    const verifyCode = async (event?: FormEvent) => {
        event?.preventDefault();
        if (loading) return;
        if (code.length < CODE_LENGTH) {
            setIssue('incomplete');
            return;
        }

        setLoading(true);
        setIssue(null);
        setLiveMessage('Verifying activation code.');
        try {
            const found = (await findProductsByUnlockCode(code)).map((productDoc) => ({id: productDoc.id, ...productDoc.data}));
            const product = found[0];
            if (!product) {
                setIssue('not-found');
                setLiveMessage('Activation code was not found.');
                return;
            }
            if (product.activated) {
                setIssue('already-activated');
                setLiveMessage('Product is already activated.');
                return;
            }
            setMatchedDevice(product);
            setDirection('forward');
            setStep('confirm');
            setLiveMessage('Product found. Confirm before activating.');
        } catch (error: any) {
            setIssue(mapWizardIssue(error?.code, 'not-found'));
            setLiveMessage('Activation code could not be verified.');
        } finally {
            setLoading(false);
        }
    };

    const activateDevice = async () => {
        if (!matchedDevice || !userId || activationLoading) return;
        setActivationLoading(true);
        setIssue(null);
        setLiveMessage('Activating device.');

        try {
            const latestProduct = await getProductDocument(matchedDevice.id);
            if (!latestProduct) {
                setIssue('not-found');
                return;
            }
            if (latestProduct.data.activated) {
                setIssue('already-activated');
                return;
            }
            await updateProduct(matchedDevice.id, {activated: true});
            await addProductToUser(userId, matchedDevice.id);
            const activatedDevice = {...matchedDevice, ...latestProduct.data, activated: true};
            setMatchedDevice(activatedDevice);
            setDirection('forward');
            setStep('success');
            setLiveMessage('Activation complete.');
        } catch (error: any) {
            setIssue(mapWizardIssue(error?.code, 'activation-failed'));
            setLiveMessage('Activation failed.');
        } finally {
            setActivationLoading(false);
        }
    };

    const returnToDashboard = () => {
        if (matchedDevice && step === 'success') {
            onComplete(matchedDevice);
            return;
        }
        onCancel();
    };

    const goToSetup = () => {
        if (matchedDevice) {
            onComplete(matchedDevice);
            navigate(`/manage-device?product_id=${matchedDevice.id}`);
        }
    };

    return (
        <PageShell bleed className="activation-page-shell" sx={{py: 0}}>
            <Box className="activation-page">
                <Box className="devices-decor devices-decor-top" aria-hidden="true"/>
                <Box className="devices-decor devices-decor-bottom" aria-hidden="true"/>
                <Box className="activation-container">
                    <Box component="header" className="activation-mobile-header">
                        <FlexPayzLogo className="devices-logo"/>
                        {step === 'confirm' ? (
                            <BackButton aria-label="Back to activation code" onClick={() => {
                                setDirection('back');
                                setStep('code');
                                setMatchedDevice(null);
                                setIssue(null);
                            }}/>
                        ) : (
                            <button type="button" className="devices-profile-button" aria-label="Close activation" onClick={onCancel}>
                                <CloseRoundedIcon aria-hidden="true"/>
                            </button>
                        )}
                    </Box>
                    <Surface className="activation-card">
                        <ActivationBrandPanel step={step}/>
                        <Box component="section" className="activation-content" aria-label="Device activation">
                            <MobileStepper step={step}/>
                            <span className="devices-live-region" aria-live="polite">{liveMessage}</span>
                            <Box key={`${step}-${issue || 'content'}`} className={`activation-step activation-step-${direction}`}>
                                {step === 'code' && (
                                    <CodeStep
                                        headingRef={headingRef}
                                        code={code}
                                        onCode={setCode}
                                        onSubmit={verifyCode}
                                        loading={loading}
                                        issue={issue}
                                        onDismissIssue={() => setIssue(null)}
                                        onCancel={onCancel}
                                    />
                                )}
                                {step === 'confirm' && matchedDevice && (
                                    <ConfirmStep
                                        headingRef={headingRef}
                                        device={matchedDevice}
                                        code={code}
                                        loading={activationLoading}
                                        issue={issue}
                                        onActivate={activateDevice}
                                        onDifferentCode={() => {
                                            setDirection('back');
                                            setStep('code');
                                            setMatchedDevice(null);
                                            setIssue(null);
                                        }}
                                    />
                                )}
                                {step === 'success' && matchedDevice && (
                                    <SuccessStep
                                        headingRef={headingRef}
                                        device={matchedDevice}
                                        onSetup={goToSetup}
                                        onBack={returnToDashboard}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Surface>
                </Box>
            </Box>
        </PageShell>
    );
}

function ActivationBrandPanel({step}: {step: WizardStep}) {
    return (
        <Box component="aside" className="activation-brand-panel" aria-label="Activation progress">
            <FlexPayzLogo className="devices-logo"/>
            <Box className="activation-brand-copy">
                <Box component="p" className="devices-kicker">ADD A DEVICE</Box>
                <Box component="h2">Activate your <span>FlexPayz product.</span></Box>
            </Box>
            <ol className="activation-desktop-steps">
                {activationSteps.map((item, index) => {
                    const state = getStepState(step, item.step);
                    return (
                        <li key={item.step} className={`activation-desktop-step activation-desktop-step-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
                            <span>{state === 'complete' ? <CheckRoundedIcon fontSize="small" aria-hidden="true"/> : index + 1}</span>
                            <strong>{item.label}</strong>
                            <small>{item.description}</small>
                        </li>
                    );
                })}
            </ol>
            <Surface tone="soft" className="activation-brand-help">
                <strong>Need help?</strong>
                <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Open the FlexPayz activation guide →</a>
            </Surface>
        </Box>
    );
}

function MobileStepper({step}: {step: WizardStep}) {
    return (
        <Box className="activation-mobile-stepper" role="list" aria-label="Activation steps">
            {activationSteps.map((item, index) => {
                const state = getStepState(step, item.step);
                return (
                    <span key={item.step} role="listitem" className={`activation-mobile-step activation-mobile-step-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
                        <span>{state === 'complete' ? <CheckRoundedIcon fontSize="small" aria-hidden="true"/> : index + 1}</span>
                        <span className="devices-live-region">{item.label}</span>
                    </span>
                );
            })}
        </Box>
    );
}

function CodeStep({
    headingRef,
    code,
    onCode,
    onSubmit,
    loading,
    issue,
    onDismissIssue,
    onCancel,
}: {
    headingRef: RefObject<HTMLHeadingElement>;
    code: string;
    onCode: (value: string) => void;
    onSubmit: (event?: FormEvent) => void;
    loading: boolean;
    issue: WizardIssue;
    onDismissIssue: () => void;
    onCancel: () => void;
}) {
    return (
        <Box component="form" className="activation-form" onSubmit={onSubmit} noValidate>
            <Box component="p" className="devices-kicker">ADD A DEVICE</Box>
            <Box component="h1" ref={headingRef} tabIndex={-1} className="activation-heading">Enter your code.</Box>
            <Box component="p" className="activation-description">Use the unique six-character code included inside your FlexPayz product packaging.</Box>
            <ActivationGuideCard/>
            <ActivationCodeInput value={code} onChange={(value) => {
                onCode(value);
                if (issue === 'incomplete' || issue === 'not-found') onDismissIssue();
            }}/>
            <WizardIssuePanel issue={issue} onAction={issue === 'already-activated' ? openSupport : onDismissIssue}/>
            <Stack direction={{xs: 'column', md: 'row'}} className="activation-actions">
                <AppButton
                    type="submit"
                    variant="contained"
                    className="devices-primary-button"
                    disabled={loading || code.length < CODE_LENGTH}
                    endIcon={loading ? <CircularProgress size={18} color="inherit" aria-label="Verifying code"/> : <ArrowForwardRoundedIcon aria-hidden="true"/>}
                >
                    Continue
                </AppButton>
                <AppButton type="button" variant="outlined" className="devices-secondary-button" onClick={onCancel}>
                    Cancel activation
                </AppButton>
            </Stack>
            <Surface className="activation-support-card">
                <strong>Having trouble?</strong>
                <p>Contact FlexPayz support for help with your code.</p>
            </Surface>
        </Box>
    );
}

function ConfirmStep({
    headingRef,
    device,
    code,
    loading,
    issue,
    onActivate,
    onDifferentCode,
}: {
    headingRef: RefObject<HTMLHeadingElement>;
    device: ManagedDevice;
    code: string;
    loading: boolean;
    issue: WizardIssue;
    onActivate: () => void;
    onDifferentCode: () => void;
}) {
    const category = getDeviceCategory(device);
    return (
        <Box className="activation-form">
            <Box component="p" className="devices-kicker">PRODUCT FOUND</Box>
            <Box component="h1" ref={headingRef} tabIndex={-1} className="activation-heading">Confirm your product.</Box>
            <Box component="p" className="activation-description">We found a FlexPayz product matching the activation code you entered.</Box>
            <Surface className="activation-product-card">
                <Box className={`activation-product-visual devices-card-visual-${category.kind}`}>
                    <ProductVisual variant={category.kind}/>
                    <span className="devices-status"><span aria-hidden="true"/>Available</span>
                </Box>
                <Box className="devices-card-kicker">{category.label}</Box>
                <Box component="h2">{getDeviceName(device)}</Box>
                <Box className="activation-product-meta">
                    <span>{getContentType(device) || 'Business card'}</span>
                    <span>Code {code}</span>
                </Box>
            </Surface>
            <WizardIssuePanel issue={issue} onAction={issue === 'already-activated' ? openSupport : onActivate}/>
            <Stack direction={{xs: 'column', md: 'row'}} className="activation-actions">
                <AppButton
                    type="button"
                    variant="contained"
                    className="devices-primary-button"
                    disabled={loading}
                    onClick={onActivate}
                    endIcon={loading ? <CircularProgress size={18} color="inherit" aria-label="Activating device"/> : <ArrowForwardRoundedIcon aria-hidden="true"/>}
                >
                    Activate this device
                </AppButton>
                <AppButton type="button" variant="outlined" className="devices-secondary-button" onClick={onDifferentCode}>
                    Use a different code
                </AppButton>
            </Stack>
            <Surface tone="soft" className="activation-support-card">
                <strong>Is this your product?</strong>
                <p>Activation permanently links the product to your FlexPayz account.</p>
            </Surface>
        </Box>
    );
}

function SuccessStep({
    headingRef,
    device,
    onSetup,
    onBack,
}: {
    headingRef: RefObject<HTMLHeadingElement>;
    device: ManagedDevice;
    onSetup: () => void;
    onBack: () => void;
}) {
    return (
        <Box className="activation-form activation-success">
            <Box className="activation-success-visual">
                <ProductVisual variant={getDeviceCategory(device).kind}/>
                <span aria-hidden="true"><CheckRoundedIcon/></span>
            </Box>
            <Box component="p" className="devices-kicker">ACTIVATION COMPLETE</Box>
            <Box component="h1" ref={headingRef} tabIndex={-1} className="activation-heading">Your device is ready.</Box>
            <Box component="p" className="activation-description">{getDeviceName(device)} is now linked to your account. You can start personalizing it right away.</Box>
            <Surface tone="soft" className="activation-ready-card">
                <span>New device</span>
                <strong>{getDeviceName(device)}</strong>
                <small>{getContentType(device) || 'Business card'}</small>
            </Surface>
            <Stack direction={{xs: 'column', md: 'row'}} className="activation-actions">
                <AppButton type="button" variant="contained" className="devices-primary-button" onClick={onSetup} endIcon={<ArrowForwardRoundedIcon aria-hidden="true"/>}>
                    Set up your device
                </AppButton>
                <AppButton type="button" variant="outlined" className="devices-secondary-button" onClick={onBack}>
                    Back to My Devices
                </AppButton>
            </Stack>
            <Surface tone="soft" className="activation-support-card">
                <strong>What happens next?</strong>
                <p>Choose what your device shares and preview the public experience before publishing.</p>
            </Surface>
        </Box>
    );
}

function ActivationCodeInput({value, onChange}: {value: string; onChange: (value: string) => void}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const chars = Array.from({length: CODE_LENGTH}, (_, index) => value[index] || '');

    const setNormalizedValue = (nextValue: string) => {
        onChange(normalizeCode(nextValue));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            return;
        }
        if (event.key === 'Backspace') {
            setNormalizedValue(value.slice(0, -1));
            event.preventDefault();
        }
    };

    return (
        <Box className="activation-code-field">
            <label htmlFor="activation-code">Activation code</label>
            <input
                ref={inputRef}
                id="activation-code"
                value={value}
                onChange={(event) => setNormalizedValue(event.target.value)}
                onKeyDown={onKeyDown}
                maxLength={CODE_LENGTH}
                autoCapitalize="characters"
                autoComplete="one-time-code"
                inputMode="text"
                aria-describedby="activation-code-help"
            />
            <Box className="activation-code-cells" aria-hidden="true" onClick={() => inputRef.current?.focus()}>
                {chars.map((char, index) => (
                    <span key={index} className={char ? 'activation-code-cell-filled' : ''}>{char}</span>
                ))}
            </Box>
            <p id="activation-code-help">Letters are automatically capitalized. Enter all six characters before continuing.</p>
        </Box>
    );
}

function WizardIssuePanel({issue, onAction}: {issue: WizardIssue; onAction: () => void}) {
    if (!issue) return null;
    const details = wizardIssues[issue];

    return (
        <Alert severity="warning" className="activation-issue" role="alert">
            <strong>{details.title}</strong>
            <p>{details.message}</p>
            <button type="button" onClick={onAction}>{details.action}</button>
        </Alert>
    );
}

function ProductVisual({variant = 'ring'}: {variant?: string}) {
    if (variant === 'card') {
        return <Box className="devices-card-shape" aria-hidden="true"><span/></Box>;
    }
    if (variant === 'tag') {
        return <Box className="devices-tag-shape" aria-hidden="true"><span/></Box>;
    }
    return (
        <Box className="entry-product-visual devices-ring-visual" aria-hidden="true">
            <Box className="entry-product-ring"/>
            <Box className="entry-product-shine"/>
        </Box>
    );
}

function ActivationGuideCard() {
    return (
        <Surface tone="soft" className="activation-guide-card">
            <Box className="activation-code-example" aria-hidden="true">
                <span/>
                <strong>ACTIVATION CODE<br/>A7C9F2</strong>
            </Box>
            <Box>
                <strong>Where can I find the code?</strong>
                <p>Look for the activation card inside your FlexPayz product packaging.</p>
                <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">View the full activation guide</a>
            </Box>
        </Surface>
    );
}

function DashboardSkeleton() {
    return (
        <Box className="devices-loading-wrap">
            <LoadingPanel text="Loading your devices"/>
        </Box>
    );
}

function NoResults({onClear}: {onClear: () => void}) {
    return (
        <Surface className="devices-no-results">
            <strong>No matching devices</strong>
            <p>Try another search.</p>
            <AppButton type="button" variant="outlined" className="devices-secondary-button" onClick={onClear}>
                Clear search
            </AppButton>
        </Surface>
    );
}

const activationSteps = [
    {step: 'code' as WizardStep, label: 'Enter activation code', description: 'Find it inside your packaging'},
    {step: 'confirm' as WizardStep, label: 'Confirm product', description: 'Review before activation'},
    {step: 'success' as WizardStep, label: 'Start setup', description: 'Personalize your device'},
];

const wizardIssues = {
    incomplete: {
        title: 'Incomplete code',
        message: 'Enter all six characters before continuing.',
        action: 'Continue entering code',
    },
    'not-found': {
        title: 'Code not found',
        message: 'Check the code and try again. Letters are not case-sensitive.',
        action: 'Try another code',
    },
    'already-activated': {
        title: 'Already activated',
        message: 'This product is already linked. Contact support if it belongs to you.',
        action: 'Contact support',
    },
    'activation-failed': {
        title: 'Couldn’t activate',
        message: 'Your connection may have been interrupted. No changes were made.',
        action: 'Try activation again',
    },
    network: {
        title: 'Couldn’t activate',
        message: 'Your connection may have been interrupted. No changes were made.',
        action: 'Try activation again',
    },
    permission: {
        title: 'Couldn’t activate',
        message: 'You do not have permission to activate this product.',
        action: 'Try activation again',
    },
};

function filterDevices(devices: ManagedDevice[], search: string) {
    const normalizedSearch = search.trim().toLowerCase();
    return devices.filter((device) => {
        const category = getDeviceCategory(device);
        const searchableText = [
            getDeviceName(device),
            category.label,
            getContentType(device),
        ].join(' ').toLowerCase();
        return !normalizedSearch || searchableText.includes(normalizedSearch);
    });
}

function getDeviceName(device: ManagedDevice) {
    return device.name?.trim() || 'FlexPayz product';
}

function getDeviceCategory(device: ManagedDevice) {
    const raw = `${device.category || device.type || device.productType || ''}`.toLowerCase();
    if (raw.includes('card')) return {label: 'Flex Card', kind: 'card'};
    if (raw.includes('tag') || device.preview === 'animal_tag') return {label: 'Pet Tag', kind: 'tag'};
    if (device.preview === 'baby-journal' || device.preview === 'adult-journal') return {label: 'Flex Ring', kind: 'ring'};
    return {label: 'Flex Ring', kind: 'ring'};
}

function getContentType(device: ManagedDevice) {
    switch (device.preview) {
        case 'custom_link':
            return 'Custom link';
        case 'upload_file':
            return 'Files';
        case 'upload_video':
            return 'Video';
        case 'upload-songs':
            return 'Songs';
        case 'baby-journal':
            return 'Baby journal';
        case 'adult-journal':
            return 'Adult journal';
        case 'animal_tag':
            return 'Animal tag';
        default:
            return 'Business card';
    }
}

function pluralizeDevices(count: number) {
    if (count === 0) return 'No active products yet';
    if (count === 1) return '1 active FlexPayz product';
    return `${count} active FlexPayz products`;
}

function normalizeCode(value: string) {
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH);
}

function getStepState(activeStep: WizardStep, step: WizardStep) {
    const activeIndex = activationSteps.findIndex((item) => item.step === activeStep);
    const stepIndex = activationSteps.findIndex((item) => item.step === step);
    if (stepIndex < activeIndex) return 'complete';
    if (stepIndex === activeIndex) return 'active';
    return 'upcoming';
}

function getDashboardError(code?: string) {
    if (code === 'permission-denied') return 'Your session may have expired. Please sign in again.';
    if (code === 'unavailable') return 'Network unavailable. Please try again.';
    return 'We could not load your devices. Please try again.';
}

function mapWizardIssue(code: string | undefined, fallback: WizardIssue) {
    if (code === 'permission-denied') return 'permission';
    if (code === 'unavailable' || code === 'deadline-exceeded') return 'network';
    return fallback;
}

function openSupport() {
    window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer');
}
