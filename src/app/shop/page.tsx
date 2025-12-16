'use client';

import { useState, useEffect } from 'react';
import AdminShop from '@/components/shop/AdminShop';
import StudentShop from '@/components/shop/StudentShop';

export default function ShopPage() {
    const [role, setRole] = useState<'teacher' | 'student' | 'admin' | null>(null);

    useEffect(() => {
        const storedRole = localStorage.getItem('userRole') as 'teacher' | 'student' | 'admin' | null;
        setRole(storedRole);
    }, []);

    if (!role) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">로그인이 필요합니다.</h2>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold"
                    >
                        로그인 페이지로 이동
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {(role === 'teacher' || role === 'admin') ? <AdminShop /> : <StudentShop />}
        </>
    );
}
