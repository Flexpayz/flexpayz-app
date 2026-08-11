import {useCallback, useEffect, useMemo, useState} from "react";
import type {MouseEvent, ReactNode} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {Box, InputAdornment, Menu, MenuItem, Stack, TextField} from "@mui/material";
import {AppButton, LoadingPanel, Surface} from "../../components/design-system";
import {
    listAdminProducts,
    ProductAdministrativeStatusFilter,
    ProductDisplayStatusFilter,
} from "../../firestore/repositories/adminProducts";
import {Preview} from "../../preview";
import {
    AdminProduct,
    CONTENT_LABELS,
    getContentLabels,
    getDisplayStatusLabel,
} from "./adminProductModel";

const PAGE_SIZE = 25;

type ListingState =
    | {status: "loading"}
    | {status: "loaded"; products: AdminProduct[]; nextCursor: string | null; hasMore: boolean; warning?: string}
    | {status: "empty"; warning?: string}
    | {status: "error"; message: string};

export function AdminProductsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, setState] = useState<ListingState>({status: "loading"});
    const [cursorStack, setCursorStack] = useState<string[]>([]);
    const [printAnchor, setPrintAnchor] = useState<HTMLElement | null>(null);
    const [printProduct, setPrintProduct] = useState<AdminProduct | null>(null);

    const queryState = useMemo(() => getQueryState(searchParams), [searchParams]);
    const [searchInput, setSearchInput] = useState(queryState.search);

    const loadProducts = useCallback(async () => {
        setState({status: "loading"});
        try {
            const result = await listAdminProducts({
                pageSize: PAGE_SIZE,
                cursor: queryState.cursor,
                search: queryState.search,
                displayStatus: queryState.status,
                administrativeStatus: queryState.adminStatus,
                owned: queryState.owned,
                productType: queryState.productType,
                serial: queryState.serial,
                content: queryState.content,
                health: queryState.health,
                includeArchived: queryState.includeArchived,
            });
            if (result.products.length === 0) {
                setState({status: "empty", warning: result.partialWarning});
                return;
            }
            setState({
                status: "loaded",
                products: result.products,
                nextCursor: result.nextCursor,
                hasMore: result.hasMore,
                warning: result.partialWarning,
            });
        } catch (error) {
            setState({status: "error", message: error instanceof Error ? error.message : "Products could not be loaded."});
        }
    }, [queryState]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const updateQuery = useCallback((key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (value && value !== "all") {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        next.delete("cursor");
        setCursorStack([]);
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

    const goNext = () => {
        if (state.status !== "loaded" || !state.nextCursor) return;
        const next = new URLSearchParams(searchParams);
        if (queryState.cursor) setCursorStack((current) => [...current, queryState.cursor || ""]);
        next.set("cursor", state.nextCursor);
        setSearchParams(next);
    };

    const goPrevious = () => {
        const next = new URLSearchParams(searchParams);
        const previous = cursorStack[cursorStack.length - 1];
        setCursorStack((current) => current.slice(0, -1));
        if (previous) {
            next.set("cursor", previous);
        } else {
            next.delete("cursor");
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
                                {state.status === "loaded" ? `Showing ${state.products.length} products on this page` : "Cursor-paginated inventory"}
                            </Box>
                        </Box>
                        <Box className="admin-create-products">
                            <AppButton variant="contained" onClick={() => navigate("/admin/products/create")} startIcon={<AddRoundedIcon/>}>
                                Create products
                            </AppButton>
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
                        <SelectFilter label="Admin status" value={queryState.adminStatus} onChange={(value) => updateQuery("adminStatus", value)} options={[
                            ["all", "All admin status"],
                            ["active", "Active"],
                            ["suspended", "Suspended"],
                            ["archived", "Archived"],
                        ]}/>
                        <SelectFilter label="Product type" value={queryState.productType} onChange={(value) => updateQuery("productType", value)} options={[
                            ["all", "All product types"],
                            ["Flex Ring", "Flex Ring"],
                            ["Flex Card", "Flex Card"],
                            ["Flex Bracelet", "Flex Bracelet"],
                            ["Pet Tag", "Pet Tag"],
                            ["Generic/Unknown Product", "Generic/Unknown Product"],
                            ["Business card", "Business card"],
                            ["Ring", "Ring"],
                            ["Card", "Card"],
                            ["Tag", "Tag"],
                            ["Custom link", "Custom link"],
                            ["Files", "Files"],
                            ["Video", "Video"],
                            ["Songs", "Songs"],
                            ["Baby journal", "Baby journal"],
                            ["Adult journal", "Adult journal"],
                        ]}/>
                        <SelectFilter label="Ownership" value={queryState.owned} onChange={(value) => updateQuery("owned", value)} options={[
                            ["all", "All ownership"],
                            ["owned", "Owned"],
                            ["unowned", "Unowned"],
                        ]}/>
                        <SelectFilter label="Serial" value={queryState.serial} onChange={(value) => updateQuery("serial", value)} options={[
                            ["all", "All serials"],
                            ["with-serial", "With serial"],
                            ["without-serial", "Without serial"],
                            ["serial-conflict", "Serial conflict"],
                        ]}/>
                        <SelectFilter label="Content" value={queryState.content} onChange={(value) => updateQuery("content", value)} options={[
                            ["all", "All content"],
                            ...Object.entries(CONTENT_LABELS),
                        ]}/>
                        <SelectFilter label="Health" value={queryState.health} onChange={(value) => updateQuery("health", value)} options={[
                            ["all", "All health"],
                            ["with-issues", "With issues"],
                        ]}/>
                    </Box>
                    <Box className="admin-muted">
                        Search is exact for product ID, unlock code and serial. Owner/name global search requires a backend search index.
                    </Box>
                </Stack>
            </Surface>

            {state.status === "loading" && <LoadingPanel text="Loading products"/>}
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
                    <ProductTable
                        products={state.products}
                        onDetails={(productId) => navigate(`/admin/products/${productId}`)}
                        onPrint={openPrintMenu}
                    />
                    <Box className="admin-pagination">
                        <AppButton variant="outlined" onClick={goPrevious} disabled={!queryState.cursor}>Previous</AppButton>
                        <AppButton variant="outlined" onClick={goNext} disabled={!state.hasMore || !state.nextCursor}>Next</AppButton>
                    </Box>
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
                        <th>Owner</th>
                        <th>Serial</th>
                        <th>Content</th>
                        <th>Access</th>
                        <th>Updated</th>
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
                <strong>{product.name}</strong>
                <span>{product.productType || "Unknown product type"} · {shortId(product.id)}</span>
            </td>
            <td><StatusPill product={product}/></td>
            <td>{formatOwner(product)}</td>
            <td>{product.serials[0]?.serialNumber || "Not assigned"}{product.serialState === "conflict" ? " · conflict" : ""}</td>
            <td>{getContentLabels(product.selectedContent).join(", ")}</td>
            <td>{product.dataHealth.length ? `${product.dataHealth.length} issue(s)` : "Allowed by capabilities"}</td>
            <td>{formatDate(product.updatedAt)}</td>
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
                        <strong>{product.name}</strong>
                        <span>{product.productType || "Unknown product type"} · {shortId(product.id)}</span>
                    </Box>
                    <StatusPill product={product}/>
                </Box>
                <dl>
                    <dt>Owner</dt><dd>{formatOwner(product)}</dd>
                    <dt>Serial</dt><dd>{product.serials[0]?.serialNumber || "Not assigned"}</dd>
                    <dt>Content</dt><dd>{getContentLabels(product.selectedContent).join(", ")}</dd>
                    <dt>Updated</dt><dd>{formatDate(product.updatedAt)}</dd>
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

function getQueryState(searchParams: URLSearchParams) {
    return {
        search: searchParams.get("q") || "",
        status: (searchParams.get("status") || "all") as ProductDisplayStatusFilter,
        adminStatus: (searchParams.get("adminStatus") || "all") as ProductAdministrativeStatusFilter,
        productType: searchParams.get("productType") || "all",
        owned: (searchParams.get("owned") || "all") as "all" | "owned" | "unowned",
        serial: (searchParams.get("serial") || "all") as "all" | "with-serial" | "without-serial" | "serial-conflict",
        content: (searchParams.get("content") || "all") as Preview | "all",
        health: (searchParams.get("health") || "all") as "all" | "with-issues",
        includeArchived: searchParams.get("status") === "archived",
        cursor: searchParams.get("cursor"),
    };
}

function formatOwner(product: AdminProduct) {
    if (product.ownershipState === "available") return "Available";
    if (product.ownershipState === "legacy-unresolved") return "Legacy owner unresolved";
    if (!product.owner) return product.ownership.ownerId || "Unknown owner";
    return product.owner.email || product.owner.displayName || product.owner.uid;
}

function formatDate(value: Date | null) {
    return value ? new Intl.DateTimeFormat("en", {dateStyle: "medium"}).format(value) : "Unknown";
}

function shortId(productId: string) {
    return productId.length > 10 ? `${productId.slice(0, 6)}…${productId.slice(-4)}` : productId;
}

function copyText(value: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value);
}
