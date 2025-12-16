import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function POST(request: Request) {
    console.log("Upload API called");
    console.log("Storage Bucket Config:", storage.app.options.storageBucket);

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const storageRef = ref(storage, `shop/${Date.now()}_${file.name}`);

        // uploadBytes works with ArrayBuffer/Uint8Array
        const snapshot = await uploadBytes(storageRef, new Uint8Array(buffer));
        const downloadURL = await getDownloadURL(snapshot.ref);

        return NextResponse.json({ url: downloadURL });
    } catch (error) {
        console.error('Upload failed:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
