import { initializeApp, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp,
  Firestore
} from "firebase/firestore";
import { getAuth, signInWithCustomToken, Auth } from "firebase/auth";
import { TariffRates, BillRecord } from "../types";

// Declare global variables injected by the environment
declare global {
  var __firebase_config: string | undefined;
  var __initial_auth_token: string | undefined;
}

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let initPromise: Promise<void> | null = null;

const TARIFF_COLLECTION = 'tariffs';
const BILLS_COLLECTION = 'monthly_bills';
const CURRENT_RATES_DOC = 'current_rates';

const _initializeFirebase = async () => {
  if (app && db) return;

  try {
    const configStr = typeof window !== 'undefined' ? window.__firebase_config : undefined;
    
    if (!configStr) {
      console.warn("Firebase config not found in global variables. Retrying or waiting for injection...");
      // In case the script runs before injection (rare but possible), we could simply return 
      // and let the next call try again, or throw. 
      // Given the error 'Database not initialized', we want to be explicit.
      return; 
    }

    const config = JSON.parse(configStr);
    app = initializeApp(config);
    db = getFirestore(app);
    auth = getAuth(app);

    if (window.__initial_auth_token) {
      await signInWithCustomToken(auth, window.__initial_auth_token);
    }
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    throw error; // Propagate error to caller
  }
};

export const ensureInitialized = async () => {
  if (!initPromise) {
    initPromise = _initializeFirebase();
  }
  await initPromise;
  
  // Retry if it failed silently (e.g. missing config first time)
  if (!db && typeof window !== 'undefined' && window.__firebase_config) {
     initPromise = _initializeFirebase();
     await initPromise;
  }
};

export const getTariffs = async (): Promise<TariffRates | null> => {
  await ensureInitialized();
  if (!db) return null;
  
  try {
    const docRef = doc(db, TARIFF_COLLECTION, CURRENT_RATES_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as TariffRates;
    }
    return null;
  } catch (e) {
    console.error("Error fetching tariffs", e);
    return null;
  }
};

export const saveTariffs = async (rates: TariffRates): Promise<void> => {
  await ensureInitialized();
  if (!db) throw new Error("Database not initialized - please check configuration");
  const docRef = doc(db, TARIFF_COLLECTION, CURRENT_RATES_DOC);
  await setDoc(docRef, rates);
};

export const saveBill = async (bill: Omit<BillRecord, 'id'>): Promise<void> => {
  await ensureInitialized();
  if (!db) throw new Error("Database not initialized - please check configuration");
  const colRef = collection(db, BILLS_COLLECTION);
  await addDoc(colRef, bill);
};

export const subscribeToHistory = (callback: (bills: BillRecord[]) => void) => {
  let unsubscribe = () => {};

  const setupSubscription = async () => {
    await ensureInitialized();
    if (!db) return;
    
    const q = query(collection(db, BILLS_COLLECTION), orderBy('date', 'desc'));
    
    unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bills: BillRecord[] = [];
      querySnapshot.forEach((doc) => {
        bills.push({ id: doc.id, ...doc.data() } as BillRecord);
      });
      callback(bills);
    });
  };

  setupSubscription();

  return () => unsubscribe();
};

// Attempt init immediately, but don't crash if it fails
ensureInitialized().catch(e => console.error("Initial auto-init failed:", e));