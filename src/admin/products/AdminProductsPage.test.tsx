import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {defaultPermissions} from "../../firestore/schema/permissions";
import {listAdminProducts} from "../../firestore/repositories/adminProducts";
import {FlexPayzThemeProvider} from "../../theme";
import {Preview} from "../../preview";
import type {AdminProduct} from "./adminProductModel";
import {AdminProductsPage} from "./AdminProductsPage";

jest.mock("../../firestore/repositories/adminProducts", () => ({
    listAdminProducts: jest.fn(),
}));

const mockedListAdminProducts = listAdminProducts as jest.MockedFunction<typeof listAdminProducts>;

function product(id: string): AdminProduct {
    return {
        id,
        raw: {},
        product: {} as never,
        name: `Product ${id}`,
        productType: "Business card",
        administrativeStatus: "active",
        ownership: {ownerId: null},
        ownershipState: "available",
        owner: null,
        serials: [],
        serialState: "none",
        selectedContent: [Preview.BUSINESS_CARD],
        capabilities: {
            permissions: defaultPermissions,
            permissionsDocumentExists: true,
        },
        transferInvitation: null,
        dataHealth: [],
        displayStatus: "available",
        createdAt: null,
        updatedAt: null,
        publicUrl: `https://flexpayz.com/show-product?product_id=${id}`,
        unlockCode: "ABC123",
    };
}

function renderPage(initialEntry = "/admin/products") {
    return render(
        <FlexPayzThemeProvider>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/admin/products" element={<AdminProductsPage/>}/>
                    <Route path="/admin/products/:productId" element={<h1>Product details</h1>}/>
                </Routes>
            </MemoryRouter>
        </FlexPayzThemeProvider>,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    mockedListAdminProducts.mockResolvedValue({
        products: [product("p1")],
        nextCursor: "p1",
        pageSize: 25,
        page: 1,
        totalCount: 30,
        totalPages: 2,
    });
});

describe("AdminProductsPage pagination", () => {
    it("shows filtered count and page summary without the create product button", async () => {
        renderPage();

        expect(await screen.findByText("30 products found")).toBeInTheDocument();
        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
        expect(screen.getByText("Showing 1-25 of 30")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Create products"})).not.toBeInTheDocument();
    });

    it("uses the cached cursor when moving to the next page", async () => {
        mockedListAdminProducts
            .mockResolvedValueOnce({
                products: [product("p1")],
                nextCursor: "p1",
                pageSize: 25,
                page: 1,
                totalCount: 30,
                totalPages: 2,
            })
            .mockResolvedValueOnce({
                products: [product("p26")],
                nextCursor: null,
                pageSize: 25,
                page: 2,
                totalCount: 30,
                totalPages: 2,
            });

        renderPage();

        fireEvent.click(await screen.findByRole("button", {name: "Next"}));

        await waitFor(() => expect(mockedListAdminProducts).toHaveBeenLastCalledWith(expect.objectContaining({
            page: 2,
            cursor: "p1",
            pageSize: 25,
        })));
        expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
        expect(screen.getByText("Showing 26-30 of 30")).toBeInTheDocument();
    });
});
