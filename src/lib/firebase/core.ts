import { db, storage } from './config';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc, setDoc, increment, deleteField, onSnapshot, query, orderBy, limit, serverTimestamp, where, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface ShopItem {
    id?: string;
    name: string;
    price: number;
    imageUrl: string;
    description?: string;
    isDonation?: boolean;
    classCode?: string; // Replaces apiKey
    quantity?: number;
    category?: 'background' | 'hair' | 'face' | 'outfit' | 'accessory' | 'cookie' | 'others';
    style?: {
        x: number;
        y: number;
        width: number;
    };
    isGlobal?: boolean;
    isHidden?: boolean;
    requiredLevel?: number; // Minimum level required to purchase
    requiredBadge?: string; // Required badge title to purchase
    isConsumable?: boolean; // True if item is a consumable/coupon
    useStock?: boolean;
    stock?: number;
    creatorName?: string;
    salesCount?: number;
    salesCookies?: number;
}


export interface Thermometer {
    id?: string;
    name: string;
    targetDegree: number;
    cookiesPerDegree: number;
    currentDegree: number;
    contributors?: Record<string, number>;
}

export interface ChatMessage {
    id?: string;
    studentCode: string;
    studentName: string;
    message: string;
    timestamp: any;
}

export interface SquareParticipant {
    studentCode: string;
    name: string;
    avatarConfig: Record<string, ShopItem>; // Equipped items
    lastActive: any;
    level?: number;
}

export interface TeacherMessage {
    id?: string;
    studentCode: string;
    studentName: string;
    message: string;
    timestamp: any;
    isRead: boolean;
}

export interface ItemSuggestion {
    id?: string;
    item: ShopItem;
    studentCode: string;
    studentName: string;
    reason: string;
    createdAt: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface BankSettings {
    rate7d: number;
    rate14d: number;
    rate28d: number;
}

export interface BankDeposit {
    id?: string;
    studentCode: string;
    term: 7 | 14 | 28;
    principal: number;
    interestRate: number;
    startDate: string; // ISO String
    endDate: string; // ISO String
    status: 'active' | 'completed';
}



const resolveClassPath = (classCode: string) => {
    // If it's a full path (e.g. schools/...), use it directly
    if (classCode.includes('/')) {
        return classCode;
    }
    // usage of flattened subcollections with default prefix
    if (classCode.includes('_')) {
        // Check if it matches our flattened convention e.g. "classes/CODE/square_online"
        // Actually, the caller usually passes "CODE" and we construct the rest.
        // But wait, the existing code constructs path like `${CLASSES_COLLECTION}/${classCode}/...`
        // So if classCode is "CODE", we get "classes/CODE/...".
        // If classCode is "schools/A/teachers/B/classes/C", we get "classes/schools/A/..." -> WRONG.
        return `classes/${classCode}`;
    }
    return `classes/${classCode}`;
};
// Correction: The logic above is slightly flawed.
// Usage in code: `classes/${classCode}/shopItems`
// Desired: `${resolvedPath}/shopItems`
// If classCode has slashes, resolvedPath = classCode.
// If classCode has no slashes, resolvedPath = `classes/${classCode}`.

const getResolvedPath = (classCode: string) => {
    if (classCode === 'GLOBAL') return 'admin/global';
    return classCode.includes('/') ? classCode : `classes/${classCode}`;
}

export const firebaseService = {
    // --- SHOP SYSTEM ---

    // Add Item (Scoped to Class)
    addItem: async (classCode: string, item: ShopItem) => {
        try {
            if (!classCode) throw new Error("Class Code is required");
            const collectionPath = `${getResolvedPath(classCode)}/shopItems`;

            const itemData = { ...item, classCode };
            const docRef = await addDoc(collection(db, collectionPath), itemData);
            return docRef.id;
        } catch (error) {
            console.error("Error adding item:", error);
            throw error;
        }
    },

    // Get Items (Scoped to Class + Global)
    getShopItems: async (classCode: string): Promise<ShopItem[]> => {
        try {
            if (!classCode) return [];
            const items: ShopItem[] = [];

            // 1. Fetch Class Local Items
            const q = collection(db, `${getResolvedPath(classCode)}/shopItems`);
            const snapshot = await getDocs(q);

            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data(), isGlobal: false } as ShopItem);
            });

            // 2. Fetch Global Items (Unless we ARE the admin managing globals)
            if (classCode !== 'GLOBAL') {
                const globalQ = collection(db, 'admin/global/shopItems');
                const globalSnapshot = await getDocs(globalQ);

                // 2.5 Fetch Hidden Global Items Config
                const configRef = doc(db, `${getResolvedPath(classCode)}/settings/shop`);
                const configSnap = await getDoc(configRef);
                const hiddenItems: string[] = configSnap.exists() ? (configSnap.data().hiddenGlobalItems || []) : [];

                globalSnapshot.forEach((doc) => {
                    const isHidden = hiddenItems.includes(doc.id);
                    items.push({
                        id: doc.id,
                        ...doc.data(),
                        isGlobal: true,
                        isHidden
                    } as ShopItem);
                });
            }

            return items.sort((a, b) => {
                if (a.isDonation && !b.isDonation) return -1;
                return a.name.localeCompare(b.name);
            });
        } catch (error) {
            console.error("Error fetching items:", error);
            return [];
        }
    },

    // Toggle Global Item Visibility
    toggleGlobalItemVisibility: async (classCode: string, itemId: string, hide: boolean) => {
        try {
            const configRef = doc(db, `${getResolvedPath(classCode)}/settings/shop`);
            // Ensure document exists
            await setDoc(configRef, { updatedAt: new Date().toISOString() }, { merge: true });

            if (hide) {
                // Add to hidden list
                // Simpler with SetDoc Merge for now since arrayUnion needs import
                // Let's assume we can import arrayUnion. Wait, I must check imports.
                // Imports line 2: ... increment, deleteField ...
                // I need to add arrayUnion, arrayRemove to imports first? 
                // Or I can read-modify-write for now to be safe without rewriting imports line.
                const snap = await getDoc(configRef);
                const currentHidden = snap.exists() ? (snap.data().hiddenGlobalItems || []) : [];
                if (!currentHidden.includes(itemId)) {
                    await setDoc(configRef, { hiddenGlobalItems: [...currentHidden, itemId] }, { merge: true });
                }
            } else {
                // Remove from hidden list
                const snap = await getDoc(configRef);
                const currentHidden = snap.exists() ? (snap.data().hiddenGlobalItems || []) : [];
                const newHidden = currentHidden.filter((id: string) => id !== itemId);
                await setDoc(configRef, { hiddenGlobalItems: newHidden }, { merge: true });
            }
        } catch (error) {
            console.error("Error toggling item visibility:", error);
            throw error;
        }
    },

    // Delete Item
    deleteItem: async (classCode: string, itemId: string) => {
        try {
            await deleteDoc(doc(db, `${getResolvedPath(classCode)}/shopItems`, itemId));
        } catch (error) {
            console.error("Error deleting item:", error);
            throw error;
        }
    },

    // Delete Item
    deleteChatMessage: async (classCode: string, messageId: string) => {
        try {
            await deleteDoc(doc(db, `${getResolvedPath(classCode)}/chat`, messageId));
        } catch (error) {
            console.error(error);
        }
    },

    // ==========================================
    // Teacher Messages (Inbox) Functions
    // ==========================================
    sendTeacherMessage: async (classCode: string, studentCode: string, studentName: string, message: string) => {
        try {
            const msgsRef = collection(db, `${getResolvedPath(classCode)}/teacherMessages`);
            await addDoc(msgsRef, {
                studentCode,
                studentName,
                message,
                isRead: false,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message to teacher:", error);
            throw error;
        }
    },

    subscribeToTeacherMessages: (classCode: string, callback: (msgs: TeacherMessage[]) => void) => {
        const msgsRef = collection(db, `${getResolvedPath(classCode)}/teacherMessages`);
        const q = query(msgsRef, orderBy('timestamp', 'desc'), limit(50));

        return onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TeacherMessage[];
            callback(msgs);
        });
    },

    markTeacherMessageRead: async (classCode: string, messageId: string) => {
        try {
            const msgRef = doc(db, `${getResolvedPath(classCode)}/teacherMessages`, messageId);
            await updateDoc(msgRef, { isRead: true });
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    },

    deleteTeacherMessage: async (classCode: string, messageId: string) => {
        try {
            const msgRef = doc(db, `${getResolvedPath(classCode)}/teacherMessages`, messageId);
            await deleteDoc(msgRef);
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    },

    // ==========================================
    // Item Suggestions Functions
    // ==========================================
    submitItemSuggestion: async (classCode: string, studentCode: string, studentName: string, itemData: ShopItem, reason: string) => {
        try {
            const suggestionsRef = collection(db, `${getResolvedPath(classCode)}/itemSuggestions`);
            await addDoc(suggestionsRef, {
                studentCode,
                studentName,
                item: itemData,
                reason,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error submitting item suggestion:", error);
            throw error;
        }
    },

    getItemSuggestions: async (classCode: string): Promise<ItemSuggestion[]> => {
        try {
            const suggestionsRef = collection(db, `${getResolvedPath(classCode)}/itemSuggestions`);
            const q = query(suggestionsRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ItemSuggestion[];
        } catch (error) {
            console.error("Error fetching item suggestions:", error);
            return [];
        }
    },

    approveItemSuggestion: async (classCode: string, suggestionId: string, itemData: ShopItem) => {
        try {
            // 1. Add to shopItems
            await firebaseService.addItem(classCode, itemData);
            // 2. Delete suggestion
            await firebaseService.deleteItemSuggestion(classCode, suggestionId);
        } catch (error) {
            console.error("Error approving item suggestion:", error);
            throw error;
        }
    },

    deleteItemSuggestion: async (classCode: string, suggestionId: string) => {
        try {
            const suggestionRef = doc(db, `${getResolvedPath(classCode)}/itemSuggestions`, suggestionId);
            await deleteDoc(suggestionRef);
        } catch (error) {
            console.error("Error deleting item suggestion:", error);
            throw error;
        }
    },

    // Update Item
    updateItem: async (classCode: string, itemId: string, updates: Partial<ShopItem>) => {
        try {
            const itemRef = doc(db, `${getResolvedPath(classCode)}/shopItems`, itemId);
            await updateDoc(itemRef, updates);

            // If name is updated and it's not a GLOBAL operation (too huge), update all students' inventories in that class
            if (updates.name && classCode !== 'GLOBAL') {
                const studentsRef = collection(db, `${getResolvedPath(classCode)}/students`);
                const studentsSnap = await getDocs(studentsRef);
                
                const updatePromises = studentsSnap.docs.map(async (studentDoc) => {
                    const inventoryRef = doc(db, `${getResolvedPath(classCode)}/students/${studentDoc.id}/inventory`, itemId);
                    try {
                        const invSnap = await getDoc(inventoryRef);
                        if (invSnap.exists()) {
                            await updateDoc(inventoryRef, { name: updates.name });
                        }
                    } catch (e) {
                        // ignore if student doesn't have it
                    }
                });
                
                await Promise.all(updatePromises);
            }
        } catch (error) {
            console.error("Error updating item:", error);
            throw error;
        }
    },

    saveUsedCookies: async (classCode: string, studentCode: string, amount: number) => {
        try {
            const cookiesRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}/cookies/used`);
            await setDoc(cookiesRef, { amount }, { merge: true });
        } catch (error) {
            console.error("Error saving used cookies:", error);
            throw error;
        }
    },

    // Get any student code for admin use
    getAnyStudentCode: async (classCode: string): Promise<string | null> => {
        try {
            const studentsRef = collection(db, `${getResolvedPath(classCode)}/students`);
            const q = query(studentsRef, limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return snapshot.docs[0].id; // The document ID is the studentCode
            }
            return null;
        } catch (error) {
            console.error("Error getting any student:", error);
            return null;
        }
    },

    // Get all students in a class
    getClassStudents: async (classCode: string): Promise<any[]> => {
        try {
            if (!classCode) return [];
            const studentsRef = collection(db, `${getResolvedPath(classCode)}/students`);
            const snapshot = await getDocs(studentsRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting class students:", error);
            return [];
        }
    },

    // Remove Student from Class
    removeStudentFromClass: async (classCode: string, studentCode: string) => {
        if (!classCode || !studentCode) return;
        try {
            // Delete main student doc
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            await deleteDoc(studentRef);

            // Delete from square if they are there
            const squareRef = doc(db, `${getResolvedPath(classCode)}/square_online/${studentCode}`);
            await deleteDoc(squareRef);
        } catch (error) {
            console.error("Error removing student from class:", error);
            throw error;
        }
    },

    // --- INVENTORY & STUDENT DATA (Scoped to Class) ---

    // Purchase Item
    purchaseItem: async (classCode: string, studentCode: string, item: ShopItem) => {
        try {
            if (!item.id || !classCode) return;

            if (item.useStock) {
                const shopItemRef = doc(db, `${item.isGlobal ? 'admin/global' : getResolvedPath(classCode)}/shopItems`, item.id);
                const shopDoc = await getDoc(shopItemRef);
                if (shopDoc.exists()) {
                    const currentStock = shopDoc.data().stock || 0;
                    if (currentStock <= 0) {
                        throw new Error("Sold out");
                    }
                    const newStock = currentStock - 1;
                    await updateDoc(shopItemRef, { 
                        stock: newStock,
                        isHidden: newStock === 0 ? true : (shopDoc.data().isHidden || false),
                        salesCount: increment(1),
                        salesCookies: increment(item.price)
                    });
                }
            } else {
                // Update sales stats even if useStock is false
                const shopItemRef = doc(db, `${item.isGlobal ? 'admin/global' : getResolvedPath(classCode)}/shopItems`, item.id);
                try {
                    await updateDoc(shopItemRef, {
                        salesCount: increment(1),
                        salesCookies: increment(item.price)
                    });
                } catch (e) {
                    // Item might be global and user doesn't have permission, ignore
                    console.warn("Could not update sales stats (might be global item)", e);
                }
            }

            // Path: {resolved}/students/{studentCode}/inventory/{itemId}
            const inventoryRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}/inventory`, item.id);
            const docSnap = await getDoc(inventoryRef);

            if (docSnap.exists()) {
                await updateDoc(inventoryRef, { quantity: increment(1) });
            } else {
                await setDoc(inventoryRef, { ...item, quantity: 1, purchasedAt: new Date().toISOString() });
            }
        } catch (error) {
            console.error("Error purchasing:", error);
            throw error;
        }
    },

    // Get Inventory
    getStudentInventory: async (classCode: string, studentCode: string): Promise<ShopItem[]> => {
        try {
            if (!classCode) return [];
            const inventoryRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/inventory`);
            const snapshot = await getDocs(inventoryRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopItem));
        } catch (error) {
            console.error("Error getting inventory:", error);
            return [];
        }
    },

    // Grant Item to Student (Teacher Gift)
    grantItemToStudent: async (classCode: string, studentCode: string, item: ShopItem) => {
        try {
            if (!item.id || !classCode || !studentCode) return;
            const inventoryRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}/inventory`, item.id);
            const docSnap = await getDoc(inventoryRef);

            if (docSnap.exists()) {
                await updateDoc(inventoryRef, { quantity: increment(1) });
            } else {
                await setDoc(inventoryRef, { ...item, quantity: 1, purchasedAt: new Date().toISOString() });
            }
        } catch (error) {
            console.error("Error granting item:", error);
            throw error;
        }
    },

    // Use Consumable Item
    useConsumableItem: async (classCode: string, studentCode: string, itemId: string) => {
        try {
            if (!classCode || !studentCode || !itemId) return;
            const inventoryRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}/inventory`, itemId);
            const docSnap = await getDoc(inventoryRef);

            if (docSnap.exists()) {
                const currentQty = docSnap.data().quantity || 1;
                if (currentQty > 1) {
                    await updateDoc(inventoryRef, { quantity: increment(-1) });
                } else {
                    await deleteDoc(inventoryRef);
                }
            }
        } catch (error) {
            console.error("Error using consumable:", error);
            throw error;
        }
    },

    // Get Class Consumable Inventories
    getAllConsumableItems: async (classCode: string): Promise<{ student: any, items: ShopItem[] }[]> => {
        try {
            const studentsRef = collection(db, `${getResolvedPath(classCode)}/students`);
            const snapshot = await getDocs(studentsRef);
            const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const promises = students.map(async (student) => {
                const inventoryRef = collection(db, `${getResolvedPath(classCode)}/students/${student.id}/inventory`);
                const invSnap = await getDocs(inventoryRef);
                const items = invSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShopItem));
                const consumables = items.filter(item => item.isConsumable);
                return { student, items: consumables };
            });
            return await Promise.all(promises);
        } catch (error) {
            console.error("Error getting all consumables:", error);
            return [];
        }
    },

    // Equip Item
    equipItem: async (classCode: string, studentCode: string, item: ShopItem, slotKey?: string) => {
        try {
            if (!classCode || !item.category) return;
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            const key = slotKey || item.category;
            await setDoc(studentRef, {
                equippedItems: { [key]: item }
            }, { merge: true });
        } catch (error) {
            console.error("Error equipping:", error);
        }
    },

    // Unequip Item
    unequipItem: async (classCode: string, studentCode: string, category: string) => {
        try {
            if (!classCode) return;
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            await updateDoc(studentRef, {
                [`equippedItems.${category}`]: deleteField()
            });
        } catch (error) {
            console.error("Error unequipping:", error);
        }
    },

    // Get Equipped Items
    getEquippedItems: async (classCode: string, studentCode: string): Promise<Record<string, ShopItem>> => {
        try {
            if (!classCode) return {};
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            const snap = await getDoc(studentRef);
            if (snap.exists()) {
                return snap.data().equippedItems || {};
            }
            return {};
        } catch (error) {
            console.error("Error retrieving equipped items:", error);
            return {};
        }
    },

    // Transaction & Stats
    recordTransaction: async (classCode: string, studentCode: string, amount: number, type: 'purchase' | 'donation', itemId?: string, itemName?: string) => {
        try {
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            await setDoc(studentRef, { usedCookies: increment(amount) }, { merge: true });

            const logRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/cookielog`);
            await addDoc(logRef, {
                amount,
                type,
                itemId: itemId || null,
                itemName: itemName || null,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Transaction error:', error);
        }
    },

    getUsedCookies: async (classCode: string, studentCode: string): Promise<number> => {
        try {
            // Aggregate from logs for robust Shadow Calculation
            const logsRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/cookielog`);
            const snapshot = await getDocs(logsRef);
            let totalUsed = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.amount) {
                    if (data.type === 'purchase' || data.type === 'donation' || data.type === 'deposit') {
                        totalUsed += Number(data.amount);
                    } else if (data.type === 'reward' || data.type === 'deposit_claim') {
                        totalUsed -= Number(data.amount);
                    }
                }
            });
            return totalUsed;
        } catch (e) {
            console.error("Error calculating used cookies:", e);
            return 0;
        }
    },

    provideCookies: async (classCode: string, studentCode: string, amount: number, reason: string) => {
        try {
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            // Record as negative usedCookies to grant balance
            await setDoc(studentRef, { usedCookies: increment(-amount) }, { merge: true });

            const logRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/cookielog`);
            await addDoc(logRef, {
                amount,
                type: 'reward',
                itemId: null,
                itemName: reason || '선생님 보너스',
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Provide cookies error:', error);
            throw error;
        }
    },

    getCookieLog: async (classCode: string, studentCode: string) => {
        try {
            const logsRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/cookielog`);
            const q = query(logsRef, orderBy('createdAt', 'desc'), limit(20));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting cookie log:", error);
            return [];
        }
    },

    // Sync Student Data
    syncStudentData: async (classCode: string, studentCode: string, name: string) => {
        try {
            const userRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            await setDoc(userRef, { name, studentCode }, { merge: true });
        } catch (error) {
            console.error("Error syncing student data:", error);
        }
    },

    // Love Temperature & Donations
    getLoveTemperature: async (classCode: string): Promise<number> => {
        try {
            const classRef = doc(db, getResolvedPath(classCode)); // getResolvedPath returns full path including collection if legacy
            const snap = await getDoc(classRef);
            return snap.exists() ? (snap.data().loveTemperature || 0) : 0;
        } catch (error) {
            return 0;
        }
    },

    increaseLoveTemperature: async (classCode: string, amount: number) => {
        try {
            // formula: 10 cookies = 0.1 degree => 1 cookie = 0.01 degree
            const incrementValue = amount * 0.01;
            const classRef = doc(db, getResolvedPath(classCode));
            await setDoc(classRef, { loveTemperature: increment(incrementValue) }, { merge: true });
        } catch (error) {
            console.error(error);
        }
    },

    recordDonation: async (classCode: string, studentCode: string, amount: number) => {
        try {
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            await setDoc(studentRef, { donatedCookies: increment(amount) }, { merge: true });
        } catch (error) {
            console.error(error);
        }
    },

    getStudentDonation: async (classCode: string, studentCode: string): Promise<number> => {
        try {
            if (!classCode) return 0;
            // Aggregate from logs for robust Shadow Calculation (Donations)
            const logsRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/cookielog`);
            const q = query(logsRef, where('type', '==', 'donation'));
            const snapshot = await getDocs(q);

            let totalDonated = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.amount) {
                    totalDonated += Number(data.amount);
                }
            });
            return totalDonated;
        } catch (error) {
            console.error("Error calculating donated cookies:", error);
            return 0;
        }
    },

    // --- THERMOMETER SYSTEM (Custom Class Thermometers) ---
    getThermometers: async (classCode: string): Promise<Thermometer[]> => {
        try {
            if (!classCode) return [];
            const q = collection(db, `${getResolvedPath(classCode)}/thermometers`);
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Thermometer)).sort((a,b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error("Error getting thermometers:", error);
            return [];
        }
    },

    addThermometer: async (classCode: string, data: Thermometer) => {
        try {
            if (!classCode) return;
            const collectionPath = `${getResolvedPath(classCode)}/thermometers`;
            await addDoc(collection(db, collectionPath), { ...data, currentDegree: 0 });
        } catch (error) {
            console.error("Error adding thermometer:", error);
            throw error;
        }
    },

    updateThermometer: async (classCode: string, id: string, updates: Partial<Thermometer>) => {
        try {
            const ref = doc(db, `${getResolvedPath(classCode)}/thermometers`, id);
            await updateDoc(ref, updates);
        } catch (error) {
            console.error("Error updating thermometer:", error);
            throw error;
        }
    },

    deleteThermometer: async (classCode: string, id: string) => {
        try {
            const ref = doc(db, `${getResolvedPath(classCode)}/thermometers`, id);
            await deleteDoc(ref);
        } catch (error) {
            console.error("Error deleting thermometer:", error);
            throw error;
        }
    },

    increaseThermometer: async (classCode: string, id: string, amount: number, cookiesPerDegree: number, studentCode?: string) => {
        try {
            const incrementValue = amount / cookiesPerDegree;
            const ref = doc(db, `${getResolvedPath(classCode)}/thermometers`, id);
            
            const updates: any = { currentDegree: increment(incrementValue) };
            if (studentCode) {
                updates.contributors = {
                    [studentCode]: increment(amount)
                };
            }
            
            await setDoc(ref, updates, { merge: true });
        } catch (error) {
            console.error("Error increasing thermometer:", error);
        }
    },

    // --- SQUARE SYSTEM (Real-time & Config) ---

    // Square Config (Background, etc)
    updateSquareConfig: async (classCode: string, config: { background?: string }) => {
        try {
            const configRef = doc(db, `${getResolvedPath(classCode)}/settings/square`);
            await setDoc(configRef, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (error) {
            console.error("Error updating square config:", error);
        }
    },

    getSquareConfig: async (classCode: string) => {
        try {
            const configRef = doc(db, `${getResolvedPath(classCode)}/settings/square`);
            const snap = await getDoc(configRef);
            return snap.exists() ? snap.data() : { background: 'bg.png' };
        } catch (error) {
            console.error("Error getting square config:", error);
            return { background: 'bg.png' };
        }
    },

    subscribeToSquareConfig: (classCode: string, callback: (config: any) => void) => {
        if (!classCode) return () => { };
        const configRef = doc(db, `${getResolvedPath(classCode)}/settings/square`);

        return onSnapshot(configRef, (doc) => {
            if (doc.exists()) {
                callback(doc.data());
            } else {
                callback({ background: 'bg.png' });
            }
        });
    },

    // Enter Square (Update Presence)
    enterSquare: async (classCode: string, studentCode: string, name: string, avatarConfig: any, level: number = 1) => {
        if (!classCode) return;
        // Path: {resolved}/square_online/{studentCode}
        const onlineRef = doc(db, `${getResolvedPath(classCode)}/square_online/${studentCode}`);
        await setDoc(onlineRef, {
            studentCode,
            name,
            avatarConfig,
            level,
            lastActive: serverTimestamp()
        });
    },

    // Update Heartbeat (Last Active Time)
    updateSquareHeartbeat: async (classCode: string, studentCode: string) => {
        if (!classCode) return;
        try {
            const onlineRef = doc(db, `${getResolvedPath(classCode)}/square_online/${studentCode}`);
            await setDoc(onlineRef, { lastActive: serverTimestamp() }, { merge: true });
        } catch (error) {
            console.error("Failed to update square heartbeat", error);
        }
    },

    // Leave Square
    leaveSquare: async (classCode: string, studentCode: string) => {
        if (!classCode) return;
        const onlineRef = doc(db, `${getResolvedPath(classCode)}/square_online/${studentCode}`);
        await deleteDoc(onlineRef);
    },

    // Send Chat Message
    sendChatMessage: async (classCode: string, studentCode: string, studentName: string, message: string) => {
        if (!classCode || !message.trim()) return;
        // Path: {resolved}/square_chat
        const chatRef = collection(db, `${getResolvedPath(classCode)}/square_chat`);
        await addDoc(chatRef, {
            studentCode,
            studentName,
            message,
            timestamp: serverTimestamp()
        });
    },

    // Subscribe to Online Users
    subscribeToSquare: (classCode: string, callback: (users: SquareParticipant[]) => void) => {
        if (!classCode) return () => { };
        // Path: {resolved}/square_online
        const q = query(collection(db, `${getResolvedPath(classCode)}/square_online`));
        return onSnapshot(q, (snapshot) => {
            const users: SquareParticipant[] = [];
            const now = Date.now();
            snapshot.forEach(doc => {
                const data = doc.data() as SquareParticipant;
                let isActive = true;
                
                // Filter out offline ghost users (no heartbeat for 3 minutes = 180,000ms)
                if (data.lastActive) {
                    const lastActiveTime = data.lastActive.toDate?.()?.getTime() || data.lastActive;
                    if (now - lastActiveTime > 180000) {
                        isActive = false;
                    }
                }
                
                if (isActive) {
                    users.push(data);
                }
            });
            callback(users);
        });
    },

    // Subscribe to Chat
    subscribeToChat: (classCode: string, callback: (messages: ChatMessage[]) => void) => {
        if (!classCode) return () => { };
        const q = query(
            collection(db, `${getResolvedPath(classCode)}/square_chat`),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        return onSnapshot(q, (snapshot) => {
            const messages: ChatMessage[] = [];
            snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() } as ChatMessage));
            callback(messages.reverse()); // Show newest at bottom
        });
    },

    // Kick all students from Square
    kickAllFromSquare: async (classCode: string) => {
        if (!classCode) return;
        const onlineRef = collection(db, `${getResolvedPath(classCode)}/square_online`);
        const snapshot = await getDocs(onlineRef);
        const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
    },

    // Get all chat messages for a class
    getAllChatMessages: async (classCode: string): Promise<ChatMessage[]> => {
        if (!classCode) return [];
        const q = query(
            collection(db, `${getResolvedPath(classCode)}/square_chat`),
            orderBy('timestamp', 'asc') // chronological order for download
        );
        const snapshot = await getDocs(q);
        const messages: ChatMessage[] = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() } as ChatMessage));
        return messages;
    },

    // --- TEACHER ACCOUNT SYSTEM ---

    registerTeacher: async (teacherId: string, password: string, apiKey: string, className: string, classCode: string, schoolName?: string, teacherName?: string) => {
        try {
            const docRef = doc(db, 'teachers', teacherId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                throw new Error("이미 존재하는 아이디입니다.");
            }

            // Construct new hierarchical path if extra info provided
            let newClassPath = classCode;
            if (schoolName && teacherName) {
                // Ensure no slashes in names to prevent path breaks (simple sanitization)
                const safeSchool = schoolName.replace(/\//g, '_');
                const safeTeacher = teacherName.replace(/\//g, '_');
                const safeClass = className.replace(/\//g, '_');
                // Path: schools/{school}/teachers/{teacher}/classes/{class}
                newClassPath = `schools/${safeSchool}/teachers/${safeTeacher}/classes/${safeClass}`;
            }

            await setDoc(docRef, {
                password,
                apiKey,
                className,
                classCode: newClassPath, // Store the FULL PATH here!
                schoolName,
                teacherName,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Registration error:", error);
            throw error;
        }
    },

    loginTeacher: async (teacherId: string, password: string) => {
        try {
            const docRef = doc(db, 'teachers', teacherId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.password === password) {
                    return data;
                }
            }
            throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
        } catch (error) {
            throw error;
        }
    },

    getTeacherInfo: async (teacherId: string) => {
        try {
            const docRef = doc(db, 'teachers', teacherId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error("Get teacher error:", error);
            throw new Error("서버 접속 지연: 선생님 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
    },

    getTeacherInfoByApiKey: async (apiKey: string) => {
        try {
            const q = query(collection(db, 'teachers'), where('apiKey', '==', apiKey), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            }
            return null;
        } catch (error) {
            console.error("Get teacher by key error:", error);
            throw new Error("서버 접속 지연: 선생님 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
    },

    // --- UTILS ---
    uploadImage: async (file: File): Promise<string> => {
        try {
            // Re-using existing proxy logic
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/upload', { method: 'POST', body: formData });

            if (!response.ok) {
                const errorText = await response.text();
                let errorDetails = errorText;
                try {
                    const errorData = JSON.parse(errorText);
                    errorDetails = JSON.stringify(errorData);
                } catch (e) {
                    // JSON parsing failed, keep raw text
                }
                console.error("Server returned error:", response.status, errorDetails);
                throw new Error(`Upload failed (Status ${response.status}): ${errorDetails}`);
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error("Upload error:", error);
            throw error;
        }
    },

    // ==========================================
    // Bank Functions
    // ==========================================

    getBankSettings: async (classCode: string): Promise<BankSettings> => {
        try {
            const settingsRef = doc(db, `${getResolvedPath(classCode)}/settings/bank`);
            const snapshot = await getDoc(settingsRef);
            if (snapshot.exists()) {
                return snapshot.data() as BankSettings;
            }
            return { rate7d: 5, rate14d: 10, rate28d: 20 }; // Defaults
        } catch (error) {
            console.error("Error fetching bank settings:", error);
            return { rate7d: 5, rate14d: 10, rate28d: 20 };
        }
    },

    updateBankSettings: async (classCode: string, settings: BankSettings) => {
        try {
            const settingsRef = doc(db, `${getResolvedPath(classCode)}/settings/bank`);
            await setDoc(settingsRef, settings, { merge: true });
        } catch (error) {
            console.error("Error updating bank settings:", error);
            throw error;
        }
    },

    buyDeposit: async (classCode: string, studentCode: string, term: 7 | 14 | 28, principal: number, rate: number) => {
        try {
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            
            // Deduct cookies (increment usedCookies)
            await setDoc(studentRef, { usedCookies: increment(principal) }, { merge: true });

            const logRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/cookielog`);
            await addDoc(logRef, {
                amount: principal, // Log as positive principal amount used
                type: 'deposit',
                itemId: 'bank_deposit',
                itemName: `다했니월드 은행 ${term}일 예금 가입`,
                createdAt: new Date().toISOString()
            });

            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + term);

            const depositRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/bankDeposits`);
            await addDoc(depositRef, {
                studentCode,
                term,
                principal,
                interestRate: rate,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                status: 'active'
            });

        } catch (error) {
            console.error("Error buying deposit:", error);
            throw error;
        }
    },

    getDeposits: async (classCode: string, studentCode: string): Promise<BankDeposit[]> => {
        try {
            const depositRef = collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/bankDeposits`);
            const q = query(depositRef, orderBy('startDate', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankDeposit));
        } catch (error) {
            console.error("Error fetching deposits:", error);
            return [];
        }
    },

    claimDeposit: async (classCode: string, studentCode: string, depositId: string, principal: number, interestRate: number) => {
        try {
            const depositRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}/bankDeposits/${depositId}`);
            const studentRef = doc(db, `${getResolvedPath(classCode)}/students/${studentCode}`);
            const logRef = doc(collection(db, `${getResolvedPath(classCode)}/students/${studentCode}/cookielog`));

            await runTransaction(db, async (transaction) => {
                const depositDoc = await transaction.get(depositRef);
                if (!depositDoc.exists()) {
                    throw new Error("예금 내역이 존재하지 않습니다.");
                }
                
                const depositData = depositDoc.data();
                if (depositData.status === 'completed') {
                    throw new Error("이미 수령한 예금입니다.");
                }

                const interest = Math.floor(principal * (interestRate / 100));
                const totalReward = principal + interest;

                transaction.update(depositRef, { status: 'completed' });
                transaction.set(studentRef, { usedCookies: increment(-totalReward) }, { merge: true });
                transaction.set(logRef, {
                    amount: totalReward,
                    type: 'deposit_claim',
                    itemId: 'bank_deposit_claim',
                    itemName: `은행 예금 만기 수령 (원금 ${principal} + 이자 ${interest})`,
                    createdAt: new Date().toISOString()
                });
            });

        } catch (error) {
            console.error("Error claiming deposit:", error);
            throw error;
        }
    }
};
