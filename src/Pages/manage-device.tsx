import './manager.css';
import {
    Alert,
    Box,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    useMediaQuery,
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ChildCareRoundedIcon from "@mui/icons-material/ChildCareRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContactPageRoundedIcon from "@mui/icons-material/ContactPageRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PetsRoundedIcon from "@mui/icons-material/PetsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {FormEvent, KeyboardEvent, RefObject, SyntheticEvent, useEffect, useMemo, useRef, useState} from "react";
import {useLocation, useNavigate} from "react-router";
import {db} from "../App";
import {AppButton} from "../components/design-system/AppButton";
import {BackButton} from "../components/design-system/BackButton";
import {FlexPayzLogo} from "../components/design-system/FlexPayzLogo";
import {LoadingPanel} from "../components/design-system/LoadingPanel";
import {PageShell} from "../components/design-system/PageShell";
import {Surface} from "../components/design-system/Surface";
import {PermissionContext, Permissions, defaultPermissions} from "../components/usePermission";
import {ManageProductContext} from "../contexts";
import {defaultProduct, Product, useEditState} from "../control-state";
import {Languages} from "../languages";
import {PUBLIC_LANGUAGES, normalizePublicLanguage} from "../public-i18n";
import {Preview} from "../preview";
import {
    PublicSectionDefinition,
    buildVisibleSectionsWrite,
    getPermittedSections,
    getPublicRoutingMode,
    getRoutingSummary,
    getSectionById,
    getVisibleSections,
} from "../product-visibility";
import {getProductIdFromURL} from "../utils";
import {useResetDevice} from "../useProductData";

type WorkspaceTab = 'overview' | 'content' | 'settings';
type SaveState = 'idle' | 'saving' | 'success' | 'error';
type PublicExperienceStatus = {state: SaveState; message: string};

const SUPPORT_URL = 'https://www.flexpayz.se/pages/get-started';
const NAME_MAX_LENGTH = 64;
const DEVICE_WORKSPACE_SHELL_SX = {
    py: 0,
    '@media (min-width: 768px)': {
        height: '100svh',
        minHeight: '100svh',
        overflow: 'hidden',
    },
};

export function ManageDevice() {
    const productId = getProductIdFromURL();
    const navigate = useNavigate();
    const location = useLocation();
    const [productState, setProductState] = useState<Product>(defaultProduct);
    const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [activeTab, setActiveTab] = useState<WorkspaceTab>(getInitialTab());
    const [openVisibilitySelector, setOpenVisibilitySelector] = useState(false);
    const tabHeadingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        setActiveTab(getInitialTab());
    }, [location.search]);

    useEffect(() => {
        let ignore = false;
        (async () => {
            if (!productId) {
                setError('Device not found.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');
            try {
                const productSnap = await getDoc(doc(db, 'products', productId));
                if (!productSnap.exists()) {
                    if (!ignore) setError('Device not found.');
                    return;
                }

                const permissionSnap = await getDoc(doc(db, 'permissions', productId));
                if (!ignore) {
                    setProductState((current) => ({...current, ...productSnap.data() as Product}));
                    setPermissions(permissionSnap.exists() ? {...defaultPermissions, ...permissionSnap.data() as Permissions} : defaultPermissions);
                }
            } catch (requestError: any) {
                if (!ignore) setError(getWorkspaceError(requestError?.code));
            } finally {
                if (!ignore) setLoading(false);
            }
        })();

        return () => {
            ignore = true;
        };
    }, [productId]);

    useEffect(() => {
        tabHeadingRef.current?.focus();
    }, [activeTab]);

    const visibleSections = useMemo(() => getVisibleSections(productState, permissions), [productState, permissions]);
    const permittedSections = useMemo(() => getPermittedSections(permissions), [permissions]);
    const publicMode = getPublicRoutingMode(visibleSections);

    const onChangeTab = (_event: SyntheticEvent, nextTab: WorkspaceTab) => {
        setActiveTab(nextTab);
        navigate(`/manage-device?product_id=${productId}&tab=${nextTab}`);
    };

    const updateProduct = (changes: Partial<Product>) => {
        setProductState((current) => ({...current, ...changes}));
    };

    if (loading) {
        return <WorkspaceLoading/>;
    }

    if (error) {
        return (
            <PageShell bleed className="device-workspace-shell" sx={DEVICE_WORKSPACE_SHELL_SX}>
                <Box className="device-workspace-page">
                    <Surface className="device-workspace-error" role="alert">
                        <strong>{error}</strong>
                        <p>Return to My Devices and choose a product again.</p>
                        <AppButton variant="contained" className="workspace-primary-button" onClick={() => navigate('/manage-devices')}>
                            Back to My Devices
                        </AppButton>
                    </Surface>
                </Box>
            </PageShell>
        );
    }

    return (
        <ManageProductContext.Provider value={{productState, setProductState, invalidFields: new Map()}}>
            <PermissionContext.Provider value={permissions}>
                <PageShell bleed className="device-workspace-shell" sx={DEVICE_WORKSPACE_SHELL_SX}>
                    <Box className="device-workspace-page device-workspace-page-loaded">
                        <Box className="device-workspace-decor device-workspace-decor-top" aria-hidden="true"/>
                        <Box className="device-workspace-decor device-workspace-decor-bottom" aria-hidden="true"/>
                        <Box className="device-workspace-layout">
                            <DeviceSidebar
                                product={productState}
                                activeTab={activeTab}
                                onChangeTab={onChangeTab}
                                visibleCount={visibleSections.length}
                                publicMode={publicMode}
                            />
                            <Box component="section" className="device-workspace-main" aria-label="Device workspace">
                                <MobileWorkspaceHeader
                                    product={productState}
                                    activeTab={activeTab}
                                    onChangeTab={onChangeTab}
                                    visibleCount={visibleSections.length}
                                />
                                <span className="workspace-live-region" aria-live="polite">{statusMessage}</span>
                                <Box key={activeTab} className="device-workspace-panel">
                                    {activeTab === 'overview' && (
                                        <DeviceOverview
                                            headingRef={tabHeadingRef}
                                            product={productState}
                                            productId={productId || ''}
                                            visibleSections={visibleSections}
                                            publicMode={publicMode}
                                        />
                                    )}
                                    {activeTab === 'content' && (
                                        <DeviceContent
                                            headingRef={tabHeadingRef}
                                            product={productState}
                                            productId={productId || ''}
                                            permittedSections={permittedSections}
                                            visibleSections={visibleSections}
                                            permissions={permissions}
                                            openSelector={openVisibilitySelector}
                                            onSelectorOpened={() => setOpenVisibilitySelector(false)}
                                            onVisibleSectionsSaved={(sections) => {
                                                updateProduct(buildVisibleSectionsWrite(sections, permissions) as Partial<Product>);
                                                setStatusMessage('Visible sections updated');
                                            }}
                                        />
                                    )}
                                    {activeTab === 'settings' && (
                                        <DeviceSettings
                                            headingRef={tabHeadingRef}
                                            product={productState}
                                            productId={productId || ''}
                                            updateProduct={updateProduct}
                                            visibleSections={visibleSections}
                                            onStatus={setStatusMessage}
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </PageShell>
            </PermissionContext.Provider>
        </ManageProductContext.Provider>
    );
}

function DeviceSidebar({
    product,
    activeTab,
    onChangeTab,
    visibleCount,
    publicMode,
}: {
    product: Product;
    activeTab: WorkspaceTab;
    onChangeTab: (event: SyntheticEvent, value: WorkspaceTab) => void;
    visibleCount: number;
    publicMode: string;
}) {
    return (
        <Box component="aside" className="device-sidebar" aria-label="Device workspace navigation">
            <FlexPayzLogo className="device-sidebar-logo"/>
            <ProductVisual/>
            <Box className="device-sidebar-identity">
                <span>{getProductType(product)}</span>
                <strong>{product.name || 'FlexPayz product'}</strong>
                <small className={!product.inactive && visibleCount > 0 ? 'workspace-status-success' : 'workspace-status-warning'}>
                    {product.inactive ? 'Inactive' : visibleCount > 0 ? 'Active' : 'Setup required'}
                </small>
            </Box>
            <Tabs
                orientation="vertical"
                value={activeTab}
                onChange={onChangeTab}
                className="device-sidebar-tabs"
                aria-label="Device workspace tabs"
            >
                <Tab value="overview" label="Overview"/>
                <Tab value="content" label="Content"/>
                <Tab value="settings" label="Settings"/>
            </Tabs>
            <Box className="device-sidebar-links">
                <a href={`/manage-device/shared-contacts?product_id=${getProductIdFromURL()}`}>Shared Contacts</a>
                <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Help & support</a>
            </Box>
            <Surface tone="soft" className="device-sidebar-status">
                <strong>Public status</strong>
                <span>{product.inactive ? 'Inactive' : publicMode === 'empty' ? 'Not configured' : publicMode === 'single' ? 'Direct section' : 'Dashboard'}</span>
                <small>{visibleCount} visible {visibleCount === 1 ? 'section' : 'sections'}</small>
            </Surface>
        </Box>
    );
}

function MobileWorkspaceHeader({
    product,
    activeTab,
    onChangeTab,
    visibleCount,
}: {
    product: Product;
    activeTab: WorkspaceTab;
    onChangeTab: (event: SyntheticEvent, value: WorkspaceTab) => void;
    visibleCount: number;
}) {
    const navigate = useNavigate();
    return (
        <Box className="device-mobile-header">
            <Box className="device-mobile-topbar">
                <FlexPayzLogo className="device-mobile-logo"/>
                <BackButton aria-label="Back to My Devices" onClick={() => navigate('/manage-devices')}/>
            </Box>
            <Surface className="device-identity-card">
                <ProductVisual/>
                <Box>
                    <span>{getProductType(product)}</span>
                    <strong>{product.name || 'FlexPayz product'}</strong>
                    <small className={!product.inactive && visibleCount > 0 ? 'workspace-status-success' : 'workspace-status-warning'}>
                        {product.inactive ? 'Inactive' : visibleCount > 0 ? 'Active' : 'Setup needed'}
                    </small>
                </Box>
                <IconButton aria-label="Open device actions">
                    <MoreHorizRoundedIcon/>
                </IconButton>
            </Surface>
            <Tabs
                value={activeTab}
                onChange={onChangeTab}
                variant="fullWidth"
                className="device-mobile-tabs"
                aria-label="Device workspace tabs"
            >
                <Tab value="overview" label="Overview"/>
                <Tab value="content" label="Content"/>
                <Tab value="settings" label="Settings"/>
            </Tabs>
        </Box>
    );
}

function DeviceOverview({
    headingRef,
    product,
    productId,
    visibleSections,
    publicMode,
}: {
    headingRef: RefObject<HTMLHeadingElement>;
    product: Product;
    productId: string;
    visibleSections: any[];
    publicMode: string;
}) {
    const visibleDefinitions = visibleSections.map(getSectionById).filter(Boolean) as PublicSectionDefinition[];
    const singleSection = visibleDefinitions[0];
    const previewUrl = `/show-product?product_id=${encodeURIComponent(productId)}&from=manage-device`;

    return (
        <Box>
            <WorkspaceHeading
                kicker={product.name || 'FlexPayz product'}
                heading="Overview"
                description="Manage what this product opens and how the public experience behaves."
                headingRef={headingRef}
                action={<a href={previewUrl} target="_blank" rel="noopener noreferrer" className="workspace-primary-link">Preview experience</a>}
            />
            <Box className="workspace-section-kicker">PUBLIC EXPERIENCE</Box>
            <Surface className="overview-public-card">
                {publicMode === 'empty' && (
                    <Box className="overview-zero-state">
                        <ProductVisual/>
                        <h2>Choose what people see.</h2>
                        <p>No public sections are visible yet. Select at least one section to continue.</p>
                        <Surface tone="soft" className="overview-inline-note">
                            Visitors see a branded “This device is not configured” message until a section is selected.
                        </Surface>
                    </Box>
                )}
                {publicMode === 'single' && singleSection && (
                    <Box>
                        <PublicCardHeader title="Opens directly" meta="1 visible section · Opens immediately after tap"/>
                        <Box className="overview-section-grid overview-section-grid-single">
                            <SectionSummaryCard section={singleSection} editable productId={productId}/>
                        </Box>
                        <Stack direction={{xs: 'column', md: 'row'}} className="workspace-actions">
                            <AppButton variant="contained" className="workspace-primary-button" onClick={() => openEditor(singleSection, productId)}>
                                Edit {singleSection.shortTitle}
                            </AppButton>
                        </Stack>
                    </Box>
                )}
                {publicMode === 'dashboard' && (
                    <Box>
                        <PublicCardHeader title="Opens an intermediary dashboard" meta={`${visibleSections.length} visible sections`}/>
                        <Box className="overview-section-grid">
                            {visibleDefinitions.map((section, index) => (
                                <SectionSummaryCard key={section.id} section={section} editable productId={productId}/>
                            ))}
                        </Box>
                    </Box>
                )}
            </Surface>
        </Box>
    );
}

function DeviceContent({
    headingRef,
    product,
    productId,
    permittedSections,
    visibleSections,
    permissions,
    openSelector,
    onSelectorOpened,
    onVisibleSectionsSaved,
}: {
    headingRef: RefObject<HTMLHeadingElement>;
    product: Product;
    productId: string;
    permittedSections: PublicSectionDefinition[];
    visibleSections: any[];
    permissions: Permissions;
    openSelector: boolean;
    onSelectorOpened: () => void;
    onVisibleSectionsSaved: (sections: any[]) => void;
}) {
    const [selectorOpen, setSelectorOpen] = useState(false);
    const professionalSections = permittedSections.filter((section) => section.group === 'professional');
    const personalSections = permittedSections.filter((section) => section.group === 'personal');

    useEffect(() => {
        if (openSelector) {
            setSelectorOpen(true);
            onSelectorOpened();
        }
    }, [openSelector, onSelectorOpened]);

    return (
        <Box>
            <WorkspaceHeading
                kicker={product.name || 'FlexPayz product'}
                heading="Content"
                description="Edit sections and control what appears publicly."
                headingRef={headingRef}
            />
            <Surface tone="soft" className="content-visibility-summary">
                <Box>
                    <strong>Public visibility</strong>
                    <p>{visibleSections.length} of {permittedSections.length} sections visible</p>
                </Box>
                <AppButton variant="contained" className="workspace-primary-button workspace-small-button" onClick={() => setSelectorOpen(true)}>Manage</AppButton>
            </Surface>
            <Box className="content-layout">
                <Box className="content-sections">
                    <SectionGroup title="Professional" sections={professionalSections} visibleSections={visibleSections} productId={productId}/>
                    <SectionGroup title="Personal" sections={personalSections} visibleSections={visibleSections} productId={productId}/>
                    <Box className="workspace-section-kicker">CONTACTS</Box>
                    <Surface className="content-section-row content-section-private">
                        <SectionIcon label={<ContactsRoundedIcon fontSize="small"/>}/>
                        <Box>
                            <strong>Shared Contacts</strong>
                            <p>Private utility · never shown publicly</p>
                        </Box>
                        <AppButton href={`/manage-device/shared-contacts?product_id=${productId}`} variant="outlined" className="workspace-secondary-button">Open contacts</AppButton>
                    </Surface>
                </Box>
                <ContentSummaryPanel
                    visibleSections={visibleSections}
                    productId={productId}
                    protectedStatus={product.publicPagePasswordActivated}
                />
            </Box>
            <VisibleSectionsDialog
                open={selectorOpen}
                onClose={() => setSelectorOpen(false)}
                visibleSections={visibleSections}
                permissions={permissions}
                productId={productId}
                onSaved={onVisibleSectionsSaved}
            />
        </Box>
    );
}

function SectionGroup({
    title,
    sections,
    visibleSections,
    productId,
}: {
    title: string;
    sections: PublicSectionDefinition[];
    visibleSections: any[];
    productId: string;
}) {
    if (sections.length === 0) return null;

    return (
        <Box>
            <Box className="workspace-section-kicker">{title}</Box>
            <Box className="content-section-list">
                {sections.map((section) => (
                    <Surface key={section.id} className="content-section-row">
                        <SectionIcon label={getSectionIcon(section)}/>
                        <Box>
                            <strong>{section.title}</strong>
                            <p>{section.description}</p>
                            <small className={visibleSections.includes(section.id) ? 'workspace-status-success' : 'workspace-status-neutral'}>
                                {visibleSections.includes(section.id) ? 'Visible' : 'Not visible'}
                            </small>
                        </Box>
                        <AppButton variant="outlined" className="workspace-secondary-button" onClick={() => openEditor(section, productId)}>
                            Edit
                        </AppButton>
                    </Surface>
                ))}
            </Box>
        </Box>
    );
}

function VisibleSectionsDialog({
    open,
    onClose,
    visibleSections,
    permissions,
    productId,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    visibleSections: any[];
    permissions: Permissions;
    productId: string;
    onSaved: (sections: any[]) => void;
}) {
    const fullScreen = useMediaQuery('(max-width: 700px)');
    const permittedSections = getPermittedSections(permissions);
    const [draft, setDraft] = useState<any[]>(visibleSections);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [error, setError] = useState('');
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const dirty = draft.join('|') !== visibleSections.join('|');

    useEffect(() => {
        if (open) {
            setDraft(visibleSections);
            setSaveState('idle');
            setError('');
            setConfirmDiscard(false);
        }
    }, [open, visibleSections]);

    const toggleSection = (section: PublicSectionDefinition) => {
        setDraft((current) => current.includes(section.id)
            ? current.filter((id) => id !== section.id)
            : [...current, section.id]
        );
    };

    const requestClose = () => {
        if (dirty) {
            setConfirmDiscard(true);
            return;
        }
        onClose();
    };

    const save = async () => {
        setSaveState('saving');
        setError('');
        try {
            const payload = buildVisibleSectionsWrite(draft, permissions);
            await updateDoc(doc(db, 'products', productId), payload);
            onSaved(payload.visibleSections);
            setSaveState('success');
            onClose();
        } catch (saveError: any) {
            setError(getWorkspaceError(saveError?.code));
            setSaveState('error');
        }
    };

    return (
        <Dialog open={open} onClose={requestClose} fullScreen={fullScreen} maxWidth="sm" fullWidth className="visible-sections-dialog">
            <DialogTitle>
                <Box className="dialog-title-row">
                    <Box>
                        <span>PUBLIC EXPERIENCE</span>
                        <strong>Choose visible sections</strong>
                    </Box>
                    <IconButton aria-label="Close visible sections" onClick={requestClose}>
                        <CloseRoundedIcon/>
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                <p className="dialog-description">Select everything visitors can open from this device.</p>
                <Surface tone="soft" className="dialog-routing-summary">
                    <strong>{draft.length} {draft.length === 1 ? 'section' : 'sections'} selected</strong>
                    <p>{getRoutingSummary(draft)}</p>
                </Surface>
                {error && <Alert severity="error" className="workspace-alert">{error}</Alert>}
                {confirmDiscard && (
                    <Alert severity="warning" className="workspace-alert">
                        <strong>Discard unsaved changes?</strong>
                        <p>Your visible-section changes have not been saved.</p>
                        <Stack direction="row" className="workspace-actions">
                            <button type="button" className="workspace-text-button" onClick={() => setConfirmDiscard(false)}>Keep editing</button>
                            <button type="button" className="workspace-text-button" onClick={onClose}>Discard</button>
                        </Stack>
                    </Alert>
                )}
                <Box className="visible-selector-list">
                    {permittedSections.map((section) => {
                        const selected = draft.includes(section.id);
                        return (
                            <button
                                type="button"
                                key={section.id}
                                className={`visible-selector-row ${selected ? 'visible-selector-row-selected' : ''}`}
                                onClick={() => toggleSection(section)}
                                role="checkbox"
                                aria-checked={selected}
                            >
                                <span className="visible-selector-check" aria-hidden="true">{selected ? <CheckRoundedIcon/> : ''}</span>
                                <span>
                                    <strong>{section.title}</strong>
                                    <small>{section.description}</small>
                                </span>
                            </button>
                        );
                    })}
                </Box>
            </DialogContent>
            <DialogActions>
                <AppButton variant="outlined" className="workspace-secondary-button" onClick={requestClose}>Cancel</AppButton>
                <AppButton variant="contained" className="workspace-primary-button" onClick={save} disabled={saveState === 'saving'}>
                    {saveState === 'saving' ? <CircularProgress size={18} color="inherit"/> : 'Save visible sections'}
                </AppButton>
                {draft.length > 0 && (
                    <a href={`/show-product?product_id=${productId}`} target="_blank" rel="noopener noreferrer" className="workspace-secondary-link">
                        Preview
                    </a>
                )}
            </DialogActions>
        </Dialog>
    );
}

function DeviceSettings({
    headingRef,
    product,
    productId,
    updateProduct,
    visibleSections,
    onStatus,
}: {
    headingRef: RefObject<HTMLHeadingElement>;
    product: Product;
    productId: string;
    updateProduct: (changes: Partial<Product>) => void;
    visibleSections: any[];
    onStatus: (message: string) => void;
}) {
    const [nameDraft, setNameDraft] = useState(product.name || '');
    const [nameState, setNameState] = useState<SaveState>('idle');
    const [nameError, setNameError] = useState('');
    const [activationState, setActivationState] = useState<SaveState>('idle');
    const [passwordEnabled, setPasswordEnabled] = useState(Boolean(product.publicPagePasswordActivated));
    const [passwordDraft, setPasswordDraft] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordState, setPasswordState] = useState<SaveState>('idle');
    const [passwordError, setPasswordError] = useState('');
    const [publicExperienceStatus, setPublicExperienceStatus] = useState<PublicExperienceStatus>({state: 'idle', message: ''});
    const [resetOpen, setResetOpen] = useState(false);
    const resetButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setNameDraft(product.name || '');
        setPasswordEnabled(Boolean(product.publicPagePasswordActivated));
    }, [product.name, product.publicPagePasswordActivated]);

    useEffect(() => {
        if (publicExperienceStatus.state !== 'success') return;
        const timeoutId = window.setTimeout(() => setPublicExperienceStatus({state: 'idle', message: ''}), 1800);
        return () => window.clearTimeout(timeoutId);
    }, [publicExperienceStatus.state, publicExperienceStatus.message]);

    const saveName = async (event: FormEvent) => {
        event.preventDefault();
        const nextName = nameDraft.trim();
        if (!nextName) {
            setNameError('Enter a device name.');
            return;
        }
        if (nextName.length > NAME_MAX_LENGTH) {
            setNameError(`Use ${NAME_MAX_LENGTH} characters or fewer.`);
            return;
        }

        setNameState('saving');
        setNameError('');
        try {
            await updateDoc(doc(db, 'products', productId), {name: nextName});
            updateProduct({name: nextName});
            setNameState('success');
            onStatus('Device name updated');
        } catch (error: any) {
            setNameError(getWorkspaceError(error?.code));
            setNameState('error');
        }
    };

    const saveLanguage = async (language: Languages) => {
        setPublicExperienceStatus({state: 'saving', message: 'Saving data'});
        try {
            await updateDoc(doc(db, 'products', productId), {previewLanguage: language});
            updateProduct({previewLanguage: language});
            setPublicExperienceStatus({state: 'success', message: 'Settings saved'});
            onStatus('Default public language updated');
        } catch {
            setPublicExperienceStatus({state: 'error', message: 'Default public language could not be saved'});
        }
    };

    const saveProductActive = async (nextActive: boolean) => {
        const previousInactive = Boolean(product.inactive);
        const nextInactive = !nextActive;
        updateProduct({inactive: nextInactive});
        setActivationState('saving');
        setPublicExperienceStatus({state: 'saving', message: 'Saving data'});
        try {
            await updateDoc(doc(db, 'products', productId), {inactive: nextInactive});
            setActivationState('success');
            setPublicExperienceStatus({state: 'success', message: 'Settings saved'});
            onStatus(nextActive ? 'Product activated' : 'Product inactivated');
        } catch (error: any) {
            updateProduct({inactive: previousInactive});
            setActivationState('error');
            setPublicExperienceStatus({state: 'error', message: getWorkspaceError(error?.code)});
        }
    };

    const savePasswordActivation = async (nextEnabled: boolean) => {
        setPasswordEnabled(nextEnabled);
        if (nextEnabled && !product.publicPagePassword) {
            setPasswordError('Enter a public password before enabling protection.');
            return;
        }

        setPasswordState('saving');
        setPasswordError('');
        setPublicExperienceStatus({state: 'saving', message: 'Saving data'});
        try {
            const payload = {publicPagePasswordActivated: nextEnabled};
            await updateDoc(doc(db, 'products', productId), payload);
            updateProduct(payload);
            setPasswordState('success');
            setPublicExperienceStatus({state: 'success', message: 'Settings saved'});
            onStatus(nextEnabled ? 'Global password protection enabled' : 'Global password protection disabled');
        } catch (error: any) {
            setPasswordError(getWorkspaceError(error?.code));
            setPasswordState('error');
            setPasswordEnabled(Boolean(product.publicPagePasswordActivated));
            setPublicExperienceStatus({state: 'error', message: 'Password protection could not be saved'});
        }
    };

    const savePasswordValue = async () => {
        const nextPassword = passwordDraft.trim();
        if (!nextPassword) return;

        setPasswordState('saving');
        setPasswordError('');
        setPublicExperienceStatus({state: 'saving', message: 'Saving data'});
        try {
            const payload = {publicPagePasswordActivated: true, publicPagePassword: nextPassword};
            await updateDoc(doc(db, 'products', productId), payload);
            updateProduct(payload);
            setPasswordDraft('');
            setPasswordEnabled(true);
            setPasswordState('success');
            setPublicExperienceStatus({state: 'success', message: 'Settings saved'});
            onStatus('Global password protection enabled');
        } catch (error: any) {
            setPasswordError(getWorkspaceError(error?.code));
            setPasswordState('error');
            setPublicExperienceStatus({state: 'error', message: 'Public password could not be saved'});
        }
    };

    const savePasswordValueOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            savePasswordValue();
        }
    };

    return (
        <Box>
            <WorkspaceHeading
                kicker={product.name || 'FlexPayz product'}
                heading="Settings"
                description="Manage device identity, privacy and language."
                headingRef={headingRef}
            />
            <Box className="settings-grid">
                <Surface className="settings-card">
                    <Box className="workspace-section-kicker">DEVICE DETAILS</Box>
                    <form onSubmit={saveName} className="settings-form">
                        <TextField
                            label="Device name"
                            value={nameDraft}
                            onChange={(event) => setNameDraft(event.target.value)}
                            error={Boolean(nameError)}
                            helperText={nameError || `Product ID · ${productId.slice(0, 4).toUpperCase()}`}
                            inputProps={{maxLength: NAME_MAX_LENGTH + 1}}
                        />
                        <AppButton type="submit" variant="contained" className="workspace-primary-button" disabled={nameState === 'saving'}>
                            {nameState === 'saving' ? <CircularProgress size={18} color="inherit"/> : 'Save name'}
                        </AppButton>
                        {nameState === 'success' && <span className="workspace-success-text">Device name saved.</span>}
                    </form>
                </Surface>
                <Surface className="settings-card">
                    <Box className="workspace-section-kicker">PUBLIC EXPERIENCE</Box>
                    <Box className="settings-row">
                        <SectionIcon label={PUBLIC_LANGUAGES[normalizePublicLanguage(product.previewLanguage)].shortLabel}/>
                        <Box>
                            <strong>Public language</strong>
                            <p>Default language visitors see on the public page.</p>
                        </Box>
                        <Select
                            value={product.previewLanguage || Languages.ENGLISH}
                            onChange={(event) => saveLanguage(event.target.value as Languages)}
                            aria-label="Public language"
                            inputProps={{'aria-label': 'Public language'}}
                            size="small"
                        >
                            {Object.values(Languages).map((language) => (
                                <MenuItem value={language} key={language}>{language.toLocaleUpperCase()}</MenuItem>
                            ))}
                        </Select>
                    </Box>
                    <Box className="settings-row settings-switch-row">
                        <SectionIcon label={<CheckRoundedIcon/>}/>
                        <Box>
                            <strong>Product active</strong>
                            <p>{product.inactive ? 'Public pages are temporarily disabled.' : 'Public pages load normally.'}</p>
                        </Box>
                        <Switch
                            className="global-password-switch"
                            checked={!product.inactive}
                            onChange={(event) => saveProductActive(event.target.checked)}
                            disabled={activationState === 'saving'}
                            inputProps={{'aria-label': 'Product active'}}
                        />
                    </Box>
                    <Box className="settings-form password-settings-form">
                        <Box className="settings-row">
                            <SectionIcon label={<LockRoundedIcon/>}/>
                            <Box>
                                <strong>Global password protection</strong>
                                <p>Require one password before visitors access the direct section or intermediary dashboard.</p>
                            </Box>
                            <Switch
                                className="global-password-switch"
                                checked={passwordEnabled}
                                onChange={(event) => savePasswordActivation(event.target.checked)}
                                disabled={passwordState === 'saving'}
                                inputProps={{'aria-label': 'Global password protection'}}
                            />
                        </Box>
                        {passwordEnabled && (
                            <TextField
                                label="Public password"
                                type={showPassword ? 'text' : 'password'}
                                value={passwordDraft}
                                onChange={(event) => setPasswordDraft(event.target.value)}
                                onBlur={savePasswordValue}
                                onKeyDown={savePasswordValueOnEnter}
                                error={Boolean(passwordError)}
                                helperText={passwordError || (product.publicPagePassword ? 'Leave blank to keep the current password.' : 'Enter a password to enable protection. It saves when you leave the field.')}
                                InputProps={{
                                    endAdornment: (
                                        <IconButton
                                            aria-label={showPassword ? 'Hide public password' : 'Show public password'}
                                            onClick={() => setShowPassword((current) => !current)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOffRoundedIcon/> : <VisibilityRoundedIcon/>}
                                        </IconButton>
                                    )
                                }}
                            />
                        )}
                    </Box>
                    <span
                        className={`public-experience-save-pill ${publicExperienceStatus.state !== 'idle' ? 'is-visible' : ''} ${publicExperienceStatus.state}`}
                        aria-live="polite"
                    >
                        {publicExperienceStatus.state === 'saving' && <CircularProgress size={14} color="inherit"/>}
                        {publicExperienceStatus.state === 'success' && <CheckRoundedIcon fontSize="small"/>}
                        {publicExperienceStatus.message || 'Saving data'}
                    </span>
                </Surface>
                <Surface tone="soft" className="settings-card">
                    <Box className="workspace-section-kicker">SUPPORT</Box>
                    <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="settings-support-link">Help & activation guide</a>
                    <p>{visibleSections.length === 0 ? 'No public sections are visible yet.' : getRoutingSummary(visibleSections)}</p>
                </Surface>
                <Surface className="settings-card settings-danger-zone">
                    <Box className="workspace-section-kicker">DANGER ZONE</Box>
                    <strong>Reset this device</strong>
                    <p>Remove personalized content and return this product to its original state.</p>
                    <AppButton
                        ref={resetButtonRef}
                        variant="outlined"
                        className="workspace-danger-button"
                        onClick={() => setResetOpen(true)}
                    >
                        Reset device
                    </AppButton>
                    <ResetDeviceDialog
                        open={resetOpen}
                        deviceName={product.name || 'FlexPayz product'}
                        onClose={() => {
                            setResetOpen(false);
                            resetButtonRef.current?.focus();
                        }}
                        onStatus={onStatus}
                    />
                </Surface>
            </Box>
        </Box>
    );
}

function ResetDeviceDialog({
    open,
    deviceName,
    onClose,
    onStatus,
}: {
    open: boolean;
    deviceName: string;
    onClose: () => void;
    onStatus: (message: string) => void;
}) {
    const [confirmation, setConfirmation] = useState('');
    const [resetting, setResetting] = useState(false);
    const [error, setError] = useState('');
    const resetDevice = useResetDevice();
    const matches = confirmation.trim() === deviceName;

    useEffect(() => {
        if (open) {
            setConfirmation('');
            setError('');
            setResetting(false);
        }
    }, [open]);

    const onReset = async () => {
        if (!matches || resetting) return;
        setResetting(true);
        setError('');
        try {
            await resetDevice();
            onStatus('Device reset complete');
            onClose();
        } catch (resetError: any) {
            setError(getWorkspaceError(resetError?.code));
            setResetting(false);
        }
    };

    return (
        <Dialog open={open} onClose={resetting ? undefined : onClose} maxWidth="sm" fullWidth className="reset-device-dialog">
            <DialogTitle>
                <span>RESET DEVICE</span>
                <strong>Reset {deviceName}?</strong>
            </DialogTitle>
            <DialogContent>
                <p>This removes personalized content and settings. Enter the device name to confirm.</p>
                <TextField
                    label="Device name"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoFocus
                    helperText="Confirmation is case-sensitive. Outer spaces are ignored."
                    fullWidth
                />
                {error && <Alert severity="error" className="workspace-alert">{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <AppButton variant="outlined" className="workspace-secondary-button" onClick={onClose} disabled={resetting}>Cancel</AppButton>
                <AppButton variant="contained" className="workspace-danger-contained" onClick={onReset} disabled={!matches || resetting}>
                    {resetting ? <CircularProgress size={18} color="inherit"/> : 'Reset device'}
                </AppButton>
            </DialogActions>
        </Dialog>
    );
}

function ContentSummaryPanel({
    visibleSections,
    productId,
    protectedStatus,
}: {
    visibleSections: any[];
    productId: string;
    protectedStatus: boolean;
}) {
    const visibleDefinitions = visibleSections.map(getSectionById).filter(Boolean) as PublicSectionDefinition[];
    return (
        <Surface tone="soft" className="content-summary-panel">
            <strong>{visibleSections.length} visible {visibleSections.length === 1 ? 'section' : 'sections'}</strong>
            <p>{visibleSections.length === 0 ? 'Visitors see the setup-required state' : visibleSections.length === 1 ? 'Opens directly' : 'Opens an intermediary dashboard'}</p>
            <ol>
                {visibleDefinitions.map((section, index) => (
                    <li key={section.id}>{index + 1} · {section.title}</li>
                ))}
            </ol>
            {visibleSections.length > 0 && (
                <a href={`/show-product?product_id=${productId}&from=manage-device`} target="_blank" rel="noopener noreferrer" className="workspace-primary-link">
                    Preview {visibleSections.length === 1 ? 'section' : 'dashboard'}
                </a>
            )}
            <span className={protectedStatus ? 'workspace-status-success' : 'workspace-status-neutral'}>{protectedStatus ? 'Protected' : 'Not protected'}</span>
        </Surface>
    );
}

function WorkspaceHeading({
    kicker,
    heading,
    description,
    headingRef,
    action,
}: {
    kicker: string;
    heading: string;
    description: string;
    headingRef: RefObject<HTMLHeadingElement>;
    action?: JSX.Element;
}) {
    return (
        <Box className="workspace-heading-row">
            <Box>
                <Box component="p" className="workspace-kicker">{kicker}</Box>
                <Box component="h1" className="workspace-heading" tabIndex={-1} ref={headingRef}>{heading}</Box>
                <Box component="p" className="workspace-description">{description}</Box>
            </Box>
            {action}
        </Box>
    );
}

function PublicCardHeader({title, meta}: {title: string; meta: string}) {
    return (
        <Box className="public-card-header">
            <SectionIcon label="⌘"/>
            <Box>
                <h2>{title}</h2>
                <p>{meta}</p>
            </Box>
        </Box>
    );
}

function SectionSummaryCard({section, editable, productId}: {section: PublicSectionDefinition; editable?: boolean; productId: string}) {
    const editSection = () => openEditor(section, productId);

    return (
        <button
            type="button"
            className="section-summary-card"
            onClick={editable ? editSection : undefined}
            aria-label={`Edit ${section.title}`}
        >
            <SectionIcon label={getSectionIcon(section)}/>
            <strong>{section.title}</strong>
            <span className="section-summary-edit-icon" aria-hidden="true">
                <EditRoundedIcon fontSize="small"/>
            </span>
        </button>
    );
}

function SectionIcon({label}: {label: any}) {
    return <span className="workspace-section-icon">{label}</span>;
}

function getSectionIcon(section: PublicSectionDefinition) {
    switch (section.id) {
        case Preview.BUSINESS_CARD:
            return <ContactPageRoundedIcon fontSize="small"/>;
        case Preview.CUSTOM_LINK:
            return <OpenInNewRoundedIcon fontSize="small"/>;
        case Preview.UPLOAD_FILE:
            return <DescriptionRoundedIcon fontSize="small"/>;
        case Preview.UPLOAD_VIDEO:
            return <PlayArrowRoundedIcon fontSize="small"/>;
        case Preview.UPLOAD_SONGS:
            return <MusicNoteRoundedIcon fontSize="small"/>;
        case Preview.BABY_JOURNAL:
            return <ChildCareRoundedIcon fontSize="small"/>;
        case Preview.ADULT_JOURNAL:
            return <HealthAndSafetyRoundedIcon fontSize="small"/>;
        case Preview.ANIMAL_TAG:
            return <PetsRoundedIcon fontSize="small"/>;
        default:
            return section.iconLabel;
    }
}

function ProductVisual() {
    return (
        <Box className="workspace-product-visual" aria-hidden="true">
            <Box className="workspace-product-ring"/>
            <Box className="workspace-product-shine"/>
        </Box>
    );
}

function WorkspaceLoading() {
    return (
        <PageShell bleed className="device-workspace-shell" sx={DEVICE_WORKSPACE_SHELL_SX}>
            <Box className="device-workspace-page device-workspace-page-loading">
                <Box className="device-workspace-layout device-workspace-layout-loading">
                    <LoadingPanel text="Loading device workspace"/>
                </Box>
            </Box>
        </PageShell>
    );
}

export function ResetProduct() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <AppButton variant="outlined" className="workspace-danger-button" onClick={() => setOpen(true)}>Reset device</AppButton>
            <ResetDeviceDialog open={open} deviceName="this device" onClose={() => setOpen(false)} onStatus={() => undefined}/>
        </>
    );
}

export function SelectLanguage() {
    const {previewLanguage} = useEditState();
    return (
        <Select
            className="select-language"
            onChange={(event) => previewLanguage.onChange(event.target.value as Languages)}
            value={previewLanguage.value}
        >
            {Object.values(Languages).map((key) => (
                <MenuItem value={key} key={key}>{key.toLocaleUpperCase()}</MenuItem>
            ))}
        </Select>
    );
}

export function SettingsHeader() {
    const productId = getProductIdFromURL();
    const navigate = useNavigate();
    return (
        <Box className="editor-settings-header">
            <FlexPayzLogo className="editor-settings-logo"/>
            <BackButton aria-label="Back to device workspace" onClick={() => navigate(`/manage-device?product_id=${productId}`)}/>
        </Box>
    );
}

function getInitialTab(): WorkspaceTab {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'content' || tab === 'settings') return tab;
    return 'overview';
}

function openEditor(section: PublicSectionDefinition, productId: string) {
    window.location.assign(`/manage-device/${section.route}?product_id=${productId}`);
}

function getProductType(product: Product) {
    if (product.preview === 'animal_tag') return 'Pet Tag';
    return 'Flex Ring';
}

function getWorkspaceError(code?: string) {
    if (code === 'permission-denied') return 'You do not have permission to manage this device.';
    if (code === 'unavailable') return 'Network unavailable. Please try again.';
    return 'This change could not be saved. Please try again.';
}
