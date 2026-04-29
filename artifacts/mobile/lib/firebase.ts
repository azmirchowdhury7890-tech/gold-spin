import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCtmTybwNAPLQe_8cXG-hYF9Z0O_3-nL3k",
  authDomain: "gold-spin-92e17.firebaseapp.com",
  projectId: "gold-spin-92e17",
  storageBucket: "gold-spin-92e17.appspot.com",
  messagingSenderId: "618944124571",
  appId: "1:618944124571:web:9c1221f759600f64c6734c",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let _auth: Auth;
try {
  if (Platform.OS === "web") {
    _auth = getAuth(app);
  } else {
    const authModule = require("firebase/auth") as typeof import("firebase/auth") & {
      getReactNativePersistence?: (storage: unknown) => unknown;
    };
    if (authModule.getReactNativePersistence) {
      _auth = initializeAuth(app, {
        persistence: authModule.getReactNativePersistence(AsyncStorage) as never,
      });
    } else {
      _auth = getAuth(app);
    }
  }
} catch {
  _auth = getAuth(app);
}

export const auth = _auth;
export const db = getFirestore(app);
export default app;
