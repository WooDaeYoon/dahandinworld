import { db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const TEACHER_COLLECTION = 'teachers';

export interface TeacherProfile {
    schoolName: string;
    teacherName: string;
    teacherId: string;
    apiKey: string;
    createdAt: string;
}

export const teacherService = {
    // Register a new teacher
    registerTeacher: async (schoolName: string, teacherName: string, teacherId: string, apiKey: string) => {
        try {
            const teacherRef = doc(db, TEACHER_COLLECTION, teacherId);
            const docSnap = await getDoc(teacherRef);

            if (docSnap.exists()) {
                throw new Error("이미 존재하는 교사 ID입니다.");
            }

            const newTeacher: TeacherProfile = {
                schoolName,
                teacherName,
                teacherId,
                apiKey,
                createdAt: new Date().toISOString()
            };

            await setDoc(teacherRef, newTeacher);
            return true;
        } catch (error) {
            console.error("Error registering teacher: ", error);
            throw error;
        }
    },

    // Verify teacher login
    verifyTeacher: async (teacherId: string, apiKey: string): Promise<boolean> => {
        try {
            const teacherRef = doc(db, TEACHER_COLLECTION, teacherId);
            const docSnap = await getDoc(teacherRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as TeacherProfile;
                // Optional: Check if API Key matches (if you want to enforce strict binding)
                // For now, we just check if the ID exists as requested.
                // if (data.apiKey !== apiKey) return false; 
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error verifying teacher: ", error);
            throw error;
        }
    },

    // Get Teacher Profile
    getTeacherProfile: async (teacherId: string): Promise<TeacherProfile | null> => {
        try {
            const teacherRef = doc(db, TEACHER_COLLECTION, teacherId);
            const docSnap = await getDoc(teacherRef);

            if (docSnap.exists()) {
                return docSnap.data() as TeacherProfile;
            }
            return null;
        } catch (error) {
            console.error("Error getting teacher profile: ", error);
            return null;
        }
    }
};
