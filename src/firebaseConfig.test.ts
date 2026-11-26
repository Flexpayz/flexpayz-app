describe("Firebase environment isolation", () => {
    const original = process.env.FLEXPAYZ_ENV;
    afterEach(() => {
        if (original === undefined) delete process.env.FLEXPAYZ_ENV;
        else process.env.FLEXPAYZ_ENV = original;
        jest.resetModules();
    });

    it.each([
        ["development", "flexpayz-app-dev"],
        ["production", "bussiness-card-bda7f"],
    ])("selects %s independently of NODE_ENV", (environment, projectId) => {
        process.env.FLEXPAYZ_ENV = environment;
        jest.isolateModules(() => {
            expect(require("./firebaseConfig").firebaseConfig.projectId).toBe(projectId);
        });
    });

    it("keeps hosted dev product links inside dev", () => {
        process.env.FLEXPAYZ_ENV = "development";
        jest.isolateModules(() => {
            const {getPublicProductOrigin} = require("./admin/products/adminProductModel");
            expect(getPublicProductOrigin({hostname: "flexpayz-app-dev.web.app", origin: "https://flexpayz-app-dev.web.app"}))
                .toBe("https://flexpayz-app-dev.web.app");
        });
    });
});

export {};
