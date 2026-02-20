import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const envMap: Record<string, string> = {};
env.split("\n").forEach(line => {
    const parts = line.split("=");
    if (parts.length >= 2) envMap[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/['"]/g, '');
});

const firebaseConfig = {
    apiKey: envMap.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: envMap.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: envMap.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: envMap.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envMap.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: envMap.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    try {
        console.log("Checking global items...");
        let snap = await getDocs(query(collection(db, "admin/global/shopItems"), limit(10)));
        snap.forEach(doc => {
            console.log(`Global Item: ${doc.data().name}, ImageUrl: ${doc.data().imageUrl}`);
        });

        const classesRef = collection(db, "classes");
        const classesSnap = await getDocs(query(classesRef, limit(2)));
        for (const classDoc of classesSnap.docs) {
            const itemsSnap = await getDocs(collection(db, `classes/${classDoc.id}/shopItems`));
            itemsSnap.forEach(doc => {
                console.log(`Class Item (${classDoc.id}): ${doc.data().name}, ImageUrl: ${doc.data().imageUrl}`);
            });
        }
    } catch (e) {
        console.error(e);
    }
}
check();
