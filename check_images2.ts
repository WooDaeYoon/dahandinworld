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
        let output = "";
        let snap = await getDocs(query(collection(db, "admin/global/shopItems"), limit(10)));
        snap.forEach(doc => {
            output += `Global Item: ${doc.data().name}, ImageUrl: ${doc.data().imageUrl}\n`;
        });
        fs.writeFileSync("image_urls.txt", output);
        console.log("Done checking");
    } catch (e) {
        console.error(e);
    }
}
check();
