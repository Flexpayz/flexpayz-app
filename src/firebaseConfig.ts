export const firebaseConfigs = {
    production: {
        apiKey: "AIzaSyD95KPFA7TG3QepgOl8iJdUM3c9RnEM11Q",
        authDomain: "bussiness-card-bda7f.firebaseapp.com",
        projectId: "bussiness-card-bda7f",
        storageBucket: "bussiness-card-bda7f.appspot.com",
        messagingSenderId: "788931798027",
        appId: "1:788931798027:web:54941df048478186d7930e",
    },
    development: {
        apiKey: "AIzaSyCRjRN0RACIePxs0Q6AmV30sIbxaFNpREo",
        authDomain: "flexpayz-app-dev.firebaseapp.com",
        projectId: "flexpayz-app-dev",
        storageBucket: "flexpayz-app-dev.firebasestorage.app",
        messagingSenderId: "503662098182",
        appId: "1:503662098182:web:6a1e3d0e1c27a039e69087",
    },
};

// Vite supplies this independently of NODE_ENV: a dev deployment is still optimized.
export const isDevelopmentFirebase = process.env.FLEXPAYZ_ENV === "development";
export const firebaseConfig = firebaseConfigs[isDevelopmentFirebase ? "development" : "production"];
