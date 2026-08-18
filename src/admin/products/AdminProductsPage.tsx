import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {MouseEvent, ReactNode} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {Box, InputAdornment, Menu, MenuItem, Stack, TextField} from "@mui/material";
import {AppButton, LoadingPanel, Surface} from "../../components/design-system";
import {
    listAdminProducts,
    AccessFilter,
    ProductDisplayStatusFilter,
} from "../../firestore/repositories/adminProducts";
import type {Permissions} from "../../firestore/schema/permissions";
import {Preview} from "../../preview";
import {
    AdminProduct,
    CONTENT_LABELS,
    getContentLabels,
    getDisplayStatusLabel,
} from "./adminProductModel";

const PAGE_SIZE = 25;
const ACCESS_LABELS: Record<keyof Permissions, string> = {
    business_card: "Business card",
    custom_link: "Custom link",
    upload_files: "Files",
    upload_video: "Video",
    upload_songs: "Songs",
    baby_journal: "Baby journal",
    adult_journal: "Adult journal",
    animal_tag: "Animal tag",
};

type ListingState =
    | {status: "loading"}
    | {status: "loaded"; products: AdminProduct[]; page: number; totalCount: number; totalPages: number; nextCursor: string | null; isRefreshing: boolean; warning?: string}
    | {status: "empty"; warning?: string}
    | {status: "error"; message: string};

export function AdminProductsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, setState] = useState<ListingState>({status: "loading"});
    const [cursorCache, setCursorCache] = useState<Record<number, string>>({});
    const [printAnchor, setPrintAnchor] = useState<HTMLElement | null>(null);
    const [printProduct, setPrintProduct] = useState<AdminProduct | null>(null);
    const requestSequence = useRef(0);

    const queryState = useMemo(() => getQueryState(searchParams), [searchParams]);
    const [searchInput, setSearchInput] = useState(queryState.search);
    const currentCursor = queryState.page > 1 ? cursorCache[queryState.page] || null : null;

    const loadProducts = useCallback(async () => {
        const requestId = requestSequence.current + 1;
        requestSequence.current = requestId;

        setState((current) => current.status === "loaded"
            ? {...current, isRefreshing: true}
            : {status: "loading"},
        );
        try {
            const result = await listAdminProducts({
                pageSize: PAGE_SIZE,
                page: queryState.page,
                cursor: currentCursor,
                search: queryState.search,
                displayStatus: queryState.status,
                serial: queryState.serial,
                access: queryState.access,
                includeArchived: queryState.includeArchived,
            });
            if (requestId !== requestSequence.current) return;
            if (result.products.length === 0) {
                setState({status: "empty", warning: result.partialWarning});
                return;
            }
            if (result.nextCursor) {
                setCursorCache((current) => ({
                    ...current,
                    [result.page + 1]: result.nextCursor || "",
                }));
            }
            setState({
                status: "loaded",
                products: result.products,
                page: result.page,
                totalCount: result.totalCount,
                totalPages: result.totalPages,
                nextCursor: result.nextCursor,
                isRefreshing: false,
                warning: result.partialWarning,
            });
        } catch (error) {
            if (requestId !== requestSequence.current) return;
            setState({status: "error", message: error instanceof Error ? error.message : "Products could not be loaded."});
        }
    }, [queryState, currentCursor]);

    useEffect(() => {
        if (queryState.page > 1 && !currentCursor) {
            const next = new URLSearchParams(searchParams);
            next.delete("page");
            setSearchParams(next, {replace: true});
            return;
        }
        loadProducts();
    }, [currentCursor, loadProducts, queryState.page, searchParams, setSearchParams]);

    const updateQuery = useCallback((key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (value && value !== "all") {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        next.delete("page");
        setCursorCache({});
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        setSearchInput(queryState.search);
    }, [queryState.search]);

    useEffect(() => {
        if (searchInput === queryState.search) return;
        const handle = window.setTimeout(() => updateQuery("q", searchInput), 350);
        return () => window.clearTimeout(handle);
    }, [searchInput, queryState.search, updateQuery]);

    const goToPage = (page: number) => {
        if (state.status !== "loaded") return;
        const boundedPage = Math.max(1, Math.min(page, state.totalPages));
        if (boundedPage > state.page && !state.nextCursor) return;
        const next = new URLSearchParams(searchParams);
        if (boundedPage > 1) {
            next.set("page", String(boundedPage));
        } else {
            next.delete("page");
        }
        setSearchParams(next);
    };

    const openPrintMenu = (event: MouseEvent<HTMLButtonElement>, product: AdminProduct) => {
        setPrintProduct(product);
        setPrintAnchor(event.currentTarget);
    };

    return (
        <Stack spacing={4} className="admin-products-redesign">
            <Surface className="admin-products-header">
                <Stack spacing={3}>
                    <Box className="admin-products-title-row">
                        <Box>
                            <Box component="h2" className="fp-typography-heading">Products</Box>
                            <Box component="p" className="admin-muted">
                                {state.status === "loaded" ? `${state.totalCount} ${state.totalCount === 1 ? "product" : "products"} found` : "Filtering product inventory"}
                            </Box>
                        </Box>
                    </Box>

                    <Box className="admin-products-toolbar">
                        <TextField
                            label="Search product ID, unlock code or serial"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchRoundedIcon className="admin-search-icon" aria-hidden="true"/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <SelectFilter label="Status" value={queryState.status} onChange={(value) => updateQuery("status", value)} options={[
                            ["all", "All status"],
                            ["active", "Active"],
                            ["available", "Available"],
                            ["suspended", "Suspended"],
                            ["archived", "Archived"],
                            ["transfer-pending", "Transfer pending"],
                            ["legacy-data-issue", "Legacy issue"],
                        ]}/>
                        <SelectFilter label="Serial" value={queryState.serial} onChange={(value) => updateQuery("serial", value)} options={[
                            ["all", "All serials"],
                            ["with-serial", "With serial"],
                            ["without-serial", "Without serial"],
                            ["serial-conflict", "Serial conflict"],
                        ]}/>
                        <SelectFilter label="Access" value={queryState.access} onChange={(value) => updateQuery("access", value)} options={[
                            ["all", "All access"],
                            ...Object.entries(ACCESS_LABELS),
                        ]}/>
                    </Box>
                    <Box className="admin-muted">
                        Search is exact for product ID, unlock code and serial. Access and serial relationship filters are applied to the loaded page in this fast view.
                    </Box>
                </Stack>
            </Surface>

            {state.status === "loading" && <LoadingPanel text="Loading products" className="admin-products-loading"/>}
            {state.status === "error" && (
                <Surface className="admin-products-state" role="alert">
                    <strong>Could not load products</strong>
                    <p>{state.message}</p>
                    <AppButton variant="contained" onClick={loadProducts}>Retry</AppButton>
                </Surface>
            )}
            {state.status === "empty" && (
                <Surface className="admin-products-state">
                    <strong>{queryState.search ? "No search results" : "No products found"}</strong>
                    <p>{state.warning || "Try changing the filters."}</p>
                </Surface>
            )}
            {state.status === "loaded" && (
                <>
                    {state.warning && <Surface className="admin-products-warning">{state.warning}</Surface>}
                    <ProductPageControls
                        page={state.page}
                        totalPages={state.totalPages}
                        totalCount={state.totalCount}
                        pageSize={PAGE_SIZE}
                        isRefreshing={state.isRefreshing}
                        hasNext={Boolean(state.nextCursor) && state.page < state.totalPages}
                        onPageChange={goToPage}
                    />
                    <ProductTable
                        products={state.products}
                        onDetails={(productId) => navigate(`/admin/products/${productId}`)}
                        onPrint={openPrintMenu}
                    />
                </>
            )}

            <Menu anchorEl={printAnchor} open={Boolean(printAnchor)} onClose={() => setPrintAnchor(null)}>
                <MenuItem onClick={() => printProduct && window.open(printProduct.publicUrl, "_blank", "noopener,noreferrer")}>
                    Open public page
                </MenuItem>
                <MenuItem onClick={() => copyText(printProduct?.publicUrl || "")}>Copy public link</MenuItem>
                <MenuItem disabled>QR and unlock-code label printing is available in Product Details</MenuItem>
            </Menu>
        </Stack>
    );
}

function ProductTable({
    products,
    onDetails,
    onPrint,
}: {
    products: AdminProduct[];
    onDetails: (productId: string) => void;
    onPrint: (event: MouseEvent<HTMLButtonElement>, product: AdminProduct) => void;
}) {
    return (
        <>
            <Box className="admin-product-table-wrap">
                <table className="admin-product-table">
                    <thead>
                    <tr>
                        <th>Product</th>
                        <th>Status</th>
                        <th>Serial</th>
                        <th>Content</th>
                        <th>Access</th>
                        <th>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {products.map((product) => (
                        <ProductRow key={product.id} product={product} onDetails={onDetails} onPrint={onPrint}/>
                    ))}
                    </tbody>
                </table>
            </Box>
            <Box className="admin-product-cards">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} onDetails={onDetails} onPrint={onPrint}/>
                ))}
            </Box>
        </>
    );
}

function ProductPageControls({
    page,
    totalPages,
    totalCount,
    pageSize,
    isRefreshing,
    hasNext,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    isRefreshing: boolean;
    hasNext: boolean;
    onPageChange: (page: number) => void;
}) {
    const firstItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const lastItem = Math.min(page * pageSize, totalCount);

    return (
        <Box className="admin-product-page-controls">
            <Box className="admin-product-page-summary">
                Page {page} of {totalPages}
                <span>{isRefreshing ? "Loading..." : `Showing ${firstItem}-${lastItem} of ${totalCount}`}</span>
            </Box>
            <Box className="admin-product-page-buttons" aria-label="Product pages">
                <AppButton variant="outlined" onClick={() => onPageChange(page - 1)} disabled={isRefreshing || page <= 1}>Previous</AppButton>
                <AppButton variant="outlined" onClick={() => onPageChange(page + 1)} disabled={isRefreshing || !hasNext}>Next</AppButton>
            </Box>
        </Box>
    );
}

function ProductRow({
    product,
    onDetails,
    onPrint,
}: {
    product: AdminProduct;
    onDetails: (productId: string) => void;
    onPrint: (event: MouseEvent<HTMLButtonElement>, product: AdminProduct) => void;
}) {
    return (
        <tr>
            <td>
                <strong>{product.id}</strong>
                <span>{product.name || "Unnamed product"}</span>
            </td>
            <td><StatusPill product={product}/></td>
            <td>{product.serials[0]?.serialNumber || "Not assigned"}{product.serialState === "conflict" ? " · conflict" : ""}</td>
            <td><ContentPills content={product.selectedContent}/></td>
            <td><AccessPills permissions={product.capabilities.permissions}/></td>
            <td>
                <Box className="admin-row-actions">
                    <IconAction label="View details" onClick={() => onDetails(product.id)} icon={<VisibilityRoundedIcon/>}/>
                    <IconAction label="Copy product ID" onClick={() => copyText(product.id)} icon={<ContentCopyRoundedIcon/>}/>
                    <IconAction label="Open public page" onClick={() => window.open(product.publicUrl, "_blank", "noopener,noreferrer")} icon={<OpenInNewRoundedIcon/>}/>
                    <IconAction label="Print menu" onClick={(event) => onPrint(event, product)} icon={<PrintRoundedIcon/>}/>
                </Box>
            </td>
        </tr>
    );
}

function ProductCard({
    product,
    onDetails,
    onPrint,
}: {
    product: AdminProduct;
    onDetails: (productId: string) => void;
    onPrint: (event: MouseEvent<HTMLButtonElement>, product: AdminProduct) => void;
}) {
    return (
        <Surface className="admin-product-card">
            <Stack spacing={2}>
                <Box className="admin-product-card-header">
                    <Box>
                        <strong>{product.id}</strong>
                        <span>{product.name || "Unnamed product"}</span>
                    </Box>
                    <StatusPill product={product}/>
                </Box>
                <dl>
                    <dt>Serial</dt><dd>{product.serials[0]?.serialNumber || "Not assigned"}</dd>
                    <dt>Content</dt><dd><ContentPills content={product.selectedContent}/></dd>
                    <dt>Access</dt><dd><AccessPills permissions={product.capabilities.permissions}/></dd>
                </dl>
                <Box className="admin-row-actions">
                    <AppButton variant="contained" onClick={() => onDetails(product.id)}>View details</AppButton>
                    <IconAction label="Copy product ID" onClick={() => copyText(product.id)} icon={<ContentCopyRoundedIcon/>}/>
                    <IconAction label="Open public page" onClick={() => window.open(product.publicUrl, "_blank", "noopener,noreferrer")} icon={<OpenInNewRoundedIcon/>}/>
                    <IconAction label="Print menu" onClick={(event) => onPrint(event, product)} icon={<PrintRoundedIcon/>}/>
                </Box>
            </Stack>
        </Surface>
    );
}

function SelectFilter({label, value, onChange, options}: {label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>}) {
    return (
        <label className="admin-filter-select">
            <span>{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
            </select>
        </label>
    );
}

function IconAction({label, onClick, icon}: {label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void; icon: ReactNode}) {
    return <button type="button" className="admin-icon-action" aria-label={label} title={label} onClick={onClick}>{icon}</button>;
}

function StatusPill({product}: {product: AdminProduct}) {
    return <span className={`admin-status-pill admin-status-${product.displayStatus}`}>{getDisplayStatusLabel(product.displayStatus)}</span>;
}

function ContentPills({content}: {content: Preview[]}) {
    const uniqueContent = content.filter((section, index, sections) => sections.indexOf(section) === index);
    const labels = uniqueContent.length === Object.keys(CONTENT_LABELS).length
        ? ["All content"]
        : getContentLabels(uniqueContent);

    return (
        <span className="admin-content-pills">
            {labels.map((label) => (
                <span key={label} className="admin-content-pill">{label}</span>
            ))}
        </span>
    );
}

function AccessPills({permissions}: {permissions: Permissions}) {
    const entries = Object.entries(ACCESS_LABELS) as Array<[keyof Permissions, string]>;
    const enabledLabels = entries
        .filter(([permission]) => permissions[permission])
        .map(([, label]) => label);
    const labels = enabledLabels.length === entries.length ? ["All access"] : enabledLabels.length > 0 ? enabledLabels : ["No access"];

    return (
        <span className="admin-content-pills">
            {labels.map((label) => (
                <span key={label} className="admin-content-pill">{label}</span>
            ))}
        </span>
    );
}

function getQueryState(searchParams: URLSearchParams) {
    return {
        search: searchParams.get("q") || "",
        status: (searchParams.get("status") || "all") as ProductDisplayStatusFilter,
        serial: (searchParams.get("serial") || "all") as "all" | "with-serial" | "without-serial" | "serial-conflict",
        access: (searchParams.get("access") || "all") as AccessFilter,
        includeArchived: searchParams.get("status") === "archived",
        page: Math.max(1, Number(searchParams.get("page")) || 1),
    };
}

function copyText(value: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value);
}
