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
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {FormEvent, RefObject, SyntheticEvent, useEffect, useMemo, useRef, useState} from "react";
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

    const openVisibleSections = () => {
        setOpenVisibilitySelector(true);
        setActiveTabAndUrl('content', productId, navigate, setActiveTab);
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
                                            onManageSections={openVisibleSections}
                                            onSettings={() => setActiveTabAndUrl('settings', productId, navigate, setActiveTab)}
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
                <small className={visibleCount > 0 ? 'workspace-status-success' : 'workspace-status-warning'}>
                    {visibleCount > 0 ? 'Active' : 'Setup required'}
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
                <span>{publicMode === 'empty' ? 'Not configured' : publicMode === 'single' ? 'Direct section' : 'Dashboard'}</span>
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
                    <small className={visibleCount > 0 ? 'workspace-status-success' : 'workspace-status-warning'}>
                        {visibleCount > 0 ? 'Active' : 'Setup needed'}
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
    onManageSections,
    onSettings,
}: {
    headingRef: RefObject<HTMLHeadingElement>;
    product: Product;
    productId: string;
    visibleSections: any[];
    publicMode: string;
    onManageSections: () => void;
    onSettings: () => void;
}) {
    const visibleDefinitions = visibleSections.map(getSectionById).filter(Boolean) as PublicSectionDefinition[];
    const singleSection = visibleDefinitions[0];
    const previewUrl = `/show-product?product_id=${encodeURIComponent(productId)}`;

    return (
        <Box>
            <WorkspaceHeading
                kicker="DEVICE OVERVIEW"
                heading={product.name || 'FlexPayz product'}
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
                        <AppButton variant="contained" className="workspace-primary-button" onClick={onManageSections} endIcon={<ArrowForwardRoundedIcon/>}>
                            Choose visible sections
                        </AppButton>
                        <Surface tone="soft" className="overview-inline-note">
                            Visitors see a branded “This device is not configured” message until a section is selected.
                        </Surface>
                    </Box>
                )}
                {publicMode === 'single' && singleSection && (
                    <Box>
                        <PublicCardHeader title="Opens directly" meta="1 visible section · Opens immediately after tap"/>
                        <Box className="overview-section-grid overview-section-grid-single">
                            <SectionSummaryCard section={singleSection} index={1} editable productId={productId}/>
                        </Box>
                        <Stack direction={{xs: 'column', md: 'row'}} className="workspace-actions">
                            <AppButton variant="contained" className="workspace-primary-button" onClick={() => openEditor(singleSection, productId)}>
                                Edit {singleSection.shortTitle}
                            </AppButton>
                            <AppButton variant="outlined" className="workspace-secondary-button" onClick={onManageSections}>Change sections</AppButton>
                            <a href={`${previewUrl}&section=${singleSection.id}`} target="_blank" rel="noopener noreferrer" className="workspace-secondary-link">
                                Preview {singleSection.shortTitle}
                            </a>
                        </Stack>
                    </Box>
                )}
                {publicMode === 'dashboard' && (
                    <Box>
                        <PublicCardHeader title="Opens an intermediary dashboard" meta={`${visibleSections.length} visible sections · Fixed order`}/>
                        <Box className="overview-section-grid">
                            {visibleDefinitions.map((section, index) => (
                                <SectionSummaryCard key={section.id} section={section} index={index + 1} editable productId={productId}/>
                            ))}
                        </Box>
                        <Stack direction={{xs: 'column', md: 'row'}} className="workspace-actions">
                            <AppButton variant="contained" className="workspace-primary-button" onClick={onManageSections}>Manage sections</AppButton>
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="workspace-secondary-link">Preview dashboard</a>
                        </Stack>
                    </Box>
                )}
            </Surface>
            <Box className="workspace-section-kicker">QUICK SETTINGS</Box>
            <Box className="quick-settings-grid">
                <QuickSetting title="Profile language" value={product.previewLanguage || Languages.ENGLISH} icon="EN" onClick={onSettings}/>
                <QuickSetting title="Global password" value={product.publicPagePasswordActivated ? 'Protected' : 'Not protected'} icon={<LockRoundedIcon/>} onClick={onSettings}/>
                <QuickSetting title="Shared Contacts" value="Private utility—not part of the public experience." icon="SC" href={`/manage-device/shared-contacts?product_id=${productId}`}/>
                <Surface className="quick-routing-rule">
                    <strong>Public routing rule</strong>
                    <p>One section opens directly. Two or more sections open the intermediary dashboard.</p>
                </Surface>
            </Box>
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
                action={<AppButton variant="contained" className="workspace-primary-button" onClick={() => setSelectorOpen(true)}>Manage visible sections</AppButton>}
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
                        <SectionIcon label="SC"/>
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
                        <SectionIcon label={section.iconLabel}/>
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
                <p className="dialog-description">Select everything visitors can open from this device. Sections always use the fixed order shown below.</p>
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
                    {permittedSections.map((section, index) => {
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
                                    <small>{index + 1} · {section.description}</small>
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
    const [languageState, setLanguageState] = useState<SaveState>('idle');
    const [passwordEnabled, setPasswordEnabled] = useState(Boolean(product.publicPagePasswordActivated));
    const [passwordDraft, setPasswordDraft] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordState, setPasswordState] = useState<SaveState>('idle');
    const [passwordError, setPasswordError] = useState('');
    const [resetOpen, setResetOpen] = useState(false);
    const resetButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setNameDraft(product.name || '');
        setPasswordEnabled(Boolean(product.publicPagePasswordActivated));
    }, [product.name, product.publicPagePasswordActivated]);

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
        setLanguageState('saving');
        try {
            await updateDoc(doc(db, 'products', productId), {previewLanguage: language});
            updateProduct({previewLanguage: language});
            setLanguageState('success');
            onStatus('Profile language updated');
        } catch {
            setLanguageState('error');
        }
    };

    const savePassword = async (event: FormEvent) => {
        event.preventDefault();
        if (passwordEnabled && !passwordDraft.trim() && !product.publicPagePasswordActivated) {
            setPasswordError('Enter a public password before enabling protection.');
            return;
        }

        setPasswordState('saving');
        setPasswordError('');
        try {
            const payload = passwordEnabled
                ? passwordDraft.trim()
                    ? {publicPagePasswordActivated: true, publicPagePassword: passwordDraft}
                    : {publicPagePasswordActivated: true}
                : {publicPagePasswordActivated: false};
            await updateDoc(doc(db, 'products', productId), payload);
            updateProduct(payload);
            setPasswordDraft('');
            setPasswordState('success');
            onStatus(passwordEnabled ? 'Global password protection updated' : 'Global password protection disabled');
        } catch (error: any) {
            setPasswordError(getWorkspaceError(error?.code));
            setPasswordState('error');
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
                        <SectionIcon label="EN"/>
                        <Box>
                            <strong>Profile language</strong>
                            <p>{product.previewLanguage || Languages.ENGLISH}</p>
                        </Box>
                        <Select
                            value={product.previewLanguage || Languages.ENGLISH}
                            onChange={(event) => saveLanguage(event.target.value as Languages)}
                            aria-label="Profile language"
                            size="small"
                        >
                            {Object.values(Languages).map((language) => (
                                <MenuItem value={language} key={language}>{language.toLocaleUpperCase()}</MenuItem>
                            ))}
                        </Select>
                    </Box>
                    {languageState === 'error' && <Alert severity="error">Profile language could not be saved.</Alert>}
                    <form onSubmit={savePassword} className="settings-form password-settings-form">
                        <Box className="settings-row">
                            <SectionIcon label={<LockRoundedIcon/>}/>
                            <Box>
                                <strong>Global password protection</strong>
                                <p>Require one password before visitors access the direct section or intermediary dashboard.</p>
                            </Box>
                            <Switch
                                className="global-password-switch"
                                checked={passwordEnabled}
                                onChange={(event) => setPasswordEnabled(event.target.checked)}
                                inputProps={{'aria-label': 'Global password protection'}}
                            />
                        </Box>
                        {passwordEnabled && (
                            <TextField
                                label="Public password"
                                type={showPassword ? 'text' : 'password'}
                                value={passwordDraft}
                                onChange={(event) => setPasswordDraft(event.target.value)}
                                error={Boolean(passwordError)}
                                helperText={passwordError || (product.publicPagePasswordActivated ? 'Leave blank to keep the current password.' : 'Enter a password to enable protection.')}
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
                        <AppButton type="submit" variant="contained" className="workspace-primary-button" disabled={passwordState === 'saving'}>
                            {passwordState === 'saving' ? <CircularProgress size={18} color="inherit"/> : passwordEnabled ? 'Save password' : 'Disable protection'}
                        </AppButton>
                        <span className={product.publicPagePasswordActivated ? 'workspace-status-success' : 'workspace-status-neutral'}>
                            {product.publicPagePasswordActivated ? 'Protected' : 'Not protected'}
                        </span>
                    </form>
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
                <a href={`/show-product?product_id=${productId}`} target="_blank" rel="noopener noreferrer" className="workspace-primary-link">
                    Preview {visibleSections.length === 1 ? 'section' : 'dashboard'}
                </a>
            )}
            <hr/>
            <strong>Fixed ordering</strong>
            <p>The public menu follows the predefined section order shown in the selector.</p>
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

function SectionSummaryCard({section, index, editable, productId}: {section: PublicSectionDefinition; index: number; editable?: boolean; productId: string}) {
    return (
        <Surface tone="soft" className="section-summary-card">
            <SectionIcon label={section.iconLabel}/>
            <strong>{section.title}</strong>
            <p>{section.description}</p>
            <small>{index} · Fixed order</small>
            {editable && (
                <button type="button" onClick={() => openEditor(section, productId)} className="workspace-text-button">
                    Edit section
                </button>
            )}
        </Surface>
    );
}

function QuickSetting({title, value, icon, onClick, href}: {title: string; value: string; icon: any; onClick?: () => void; href?: string}) {
    const content = (
        <>
            <SectionIcon label={icon}/>
            <Box>
                <strong>{title}</strong>
                <p>{value}</p>
            </Box>
            <ArrowForwardRoundedIcon aria-hidden="true"/>
        </>
    );

    if (href) {
        return <a href={href} className="quick-setting-card">{content}</a>;
    }

    return <button type="button" className="quick-setting-card" onClick={onClick}>{content}</button>;
}

function SectionIcon({label}: {label: any}) {
    return <span className="workspace-section-icon">{label}</span>;
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

function setActiveTabAndUrl(tab: WorkspaceTab, productId: string | null, navigate: ReturnType<typeof useNavigate>, setActiveTab: (tab: WorkspaceTab) => void) {
    setActiveTab(tab);
    navigate(`/manage-device?product_id=${productId}&tab=${tab}`);
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
