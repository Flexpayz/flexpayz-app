import {fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {FlexPayzThemeProvider} from "../../theme";
import {AdminProductCreatePage} from "./AdminProductCreatePage";

function renderPage() {
    return render(
        <FlexPayzThemeProvider>
            <MemoryRouter>
                <AdminProductCreatePage/>
            </MemoryRouter>
        </FlexPayzThemeProvider>,
    );
}

describe("AdminProductCreatePage", () => {
    it("renders configure controls without serial inputs or preselected capabilities", () => {
        renderPage();

        expect(screen.getByRole("heading", {name: "Create products"})).toBeInTheDocument();
        expect(screen.getByLabelText("Product type")).toBeInTheDocument();
        expect(screen.queryByLabelText(/serial/i)).not.toBeInTheDocument();
        expect(screen.getAllByRole("checkbox")).toHaveLength(8);
        expect(screen.getAllByRole("checkbox").every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
    });

    it("requires at least one capability before review", () => {
        renderPage();

        fireEvent.click(screen.getByRole("button", {name: "Review creation"}));

        expect(screen.getByText("Review the creation settings")).toBeInTheDocument();
        expect(screen.getByText("Select at least one content capability.")).toBeInTheDocument();
    });
});

