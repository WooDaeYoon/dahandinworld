'use client';

import React, { useState, useEffect } from 'react';
import { firebaseService, ShopItem, SquareParticipant } from '@/lib/firebase/core';
import AvatarDisplay from './AvatarDisplay';
import { getProxyImageUrl } from '@/lib/utils';

export default function AdminShop() {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [newItem, setNewItem] = useState<Partial<ShopItem>>({
        name: '',
        price: 0,
        imageUrl: '',
        isDonation: false,
        category: 'accessory',
        requiredLevel: 0,
        requiredBadge: '',
        style: { x: 0, y: 0, width: 100 }
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<number>(0);
    const [editLevel, setEditLevel] = useState<number>(0);

    const [classCode, setClassCode] = useState<string | null>(null);
    const [className, setClassName] = useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<'all' | 'background' | 'hair' | 'face' | 'outfit' | 'accessory' | 'others' | 'consumable'>('all');
    const [activeTab, setActiveTab] = useState<'shop' | 'students' | 'coupons' | 'square'>('shop');
    const [students, setStudents] = useState<any[]>([]);
    const [itemType, setItemType] = useState<'permanent' | 'consumable'>('permanent');
    const [couponsData, setCouponsData] = useState<{ student: any, items: ShopItem[] }[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

    // Coupon Issuance State
    const [isIssuingCoupon, setIsIssuingCoupon] = useState<boolean>(false);
    const [issueSelectedCoupon, setIssueSelectedCoupon] = useState<string | null>(null);
    const [issueSelectedStudents, setIssueSelectedStudents] = useState<string[]>([]);

    // Coupon Bulk Use State
    const [useSelectedStudents, setUseSelectedStudents] = useState<string[]>([]);

    // Student Detail Modal State
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [studentCookieLogs, setStudentCookieLogs] = useState<any[]>([]);
    const [rewardAmount, setRewardAmount] = useState<number>(0);
    const [rewardReason, setRewardReason] = useState<string>('');
    const [isProvidingCookie, setIsProvidingCookie] = useState(false);

    // Square Management State
    const [squareParticipants, setSquareParticipants] = useState<SquareParticipant[]>([]);
    const [squareConfig, setSquareConfig] = useState<{ background?: string }>({ background: 'bg.png' });

    const categories = [
        { id: 'all', label: '전체' },
        { id: 'background', label: '배경' },
        { id: 'hair', label: '헤어' },
        { id: 'face', label: '얼굴' },
        { id: 'outfit', label: '의상' },
        { id: 'accessory', label: '액세서리' },
        { id: 'others', label: '기타' },
        { id: 'consumable', label: '🎟️ 쿠폰/소모품' },
    ];

    const fetchStudents = async (code: string) => {
        try {
            const fetchedStudents = await firebaseService.getClassStudents(code);
            setStudents(fetchedStudents);
        } catch (error) {
            console.error("Failed to fetch students:", error);
        }
    };

    const fetchCoupons = async (code: string) => {
        setLoadingCoupons(true);
        try {
            const data = await firebaseService.getAllConsumableItems(code);
            setCouponsData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingCoupons(false);
        }
    };

    const handleUseCoupon = async (studentCode: string, itemId: string) => {
        if (!classCode) return;
        if (!confirm("해당 학생의 쿠폰 1개를 사용 완료 처리하시겠습니까?")) return;
        try {
            await firebaseService.useConsumableItem(classCode, studentCode, itemId);
            alert("사용 완료 처리되었습니다.");
            fetchCoupons(classCode);
        } catch (error) {
            alert("처리 중 오류가 발생했습니다.");
        }
    };

    const handleBulkUseCoupons = async () => {
        if (!classCode || !selectedCouponId || useSelectedStudents.length === 0) return;
        if (!confirm(`선택한 ${useSelectedStudents.length}명 학생의 쿠폰 1개씩을 사용 완료 처리하시겠습니까?`)) return;

        setLoadingCoupons(true);
        try {
            const promises = useSelectedStudents.map(studentId => 
                firebaseService.useConsumableItem(classCode, studentId, selectedCouponId)
            );
            await Promise.all(promises);
            alert("일괄 사용 완료 처리되었습니다.");
            setUseSelectedStudents([]);
            fetchCoupons(classCode);
        } catch (error) {
            console.error(error);
            alert("일괄 처리 중 오류가 발생했습니다.");
        } finally {
            setLoadingCoupons(false);
        }
    };

    const handleIssueCoupons = async () => {
        if (!classCode || !issueSelectedCoupon || issueSelectedStudents.length === 0) {
            alert("지급할 쿠폰과 대상을 모두 선택해주세요.");
            return;
        }

        const couponItem = items.find(i => i.id === issueSelectedCoupon);
        if (!couponItem) return;

        if (!confirm(`선택한 ${issueSelectedStudents.length}명 학생에게 '${couponItem.name}'을(를) 지급하시겠습니까?`)) return;

        setLoadingCoupons(true);
        try {
            const promises = issueSelectedStudents.map(studentId => 
                firebaseService.purchaseItem(classCode, studentId, couponItem)
            );
            await Promise.all(promises);
            alert("쿠폰 일괄 지급이 완료되었습니다.");
            setIsIssuingCoupon(false);
            setIssueSelectedCoupon(null);
            setIssueSelectedStudents([]);
            fetchCoupons(classCode);
        } catch (error) {
            console.error(error);
            alert("지급 중 오류가 발생했습니다.");
        } finally {
            setLoadingCoupons(false);
        }
    };

    useEffect(() => {
        const storedClassCode = localStorage.getItem('classCode');
        const storedClassName = localStorage.getItem('className');
        const storedApiKey = localStorage.getItem('apiKey');

        setClassCode(storedClassCode);
        setClassName(storedClassName);
        if (storedClassCode) {
            fetchItems(storedClassCode);
            if (storedClassCode !== 'GLOBAL') {
                fetchStudents(storedClassCode);
                fetchCoupons(storedClassCode);
            }
        } else {
            alert("학급 정보가 없습니다. 다시 로그인해주세요.");
            window.location.href = '/login';
        }
    }, []);



    const fetchItems = async (code: string) => {
        setLoading(true);
        try {
            const fetchedItems = await firebaseService.getShopItems(code);
            setItems(fetchedItems);
        } catch (error) {
            console.error("Failed to fetch items:", error);
            alert("아이템 목록을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // Set up Square Management Subscription
    useEffect(() => {
        if (!classCode || classCode === 'GLOBAL' || activeTab !== 'square') return;

        const unsubParticipants = firebaseService.subscribeToSquare(classCode, (users) => {
            setSquareParticipants(users);
        });

        const unsubConfig = firebaseService.subscribeToSquareConfig(classCode, (config) => {
            setSquareConfig(config || { background: 'bg.png' });
        });

        return () => {
            unsubParticipants();
            unsubConfig();
        };
    }, [classCode, activeTab]);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.name || (newItem.price !== undefined && newItem.price < 0)) return;
        if (!classCode) return;

        setLoading(true);
        try {
            let imageUrl = newItem.imageUrl || '';

            if (imageFile) {
                // Vercel Serverless Function Limit (4.5MB) check
                if (imageFile.size > 4 * 1024 * 1024) {
                    alert('이미지 파일 용량이 너무 큽니다. 4MB 이하의 이미지를 업로드해주세요.');
                    setLoading(false);
                    return;
                }
                imageUrl = await firebaseService.uploadImage(imageFile);
            }

            const payload: any = {
                name: newItem.name!,
                price: newItem.price || 0,
                imageUrl: imageUrl,
                isDonation: newItem.isDonation || false,
                category: itemType === 'consumable' ? 'others' : newItem.category,
                requiredLevel: newItem.requiredLevel || 0,
                requiredBadge: newItem.requiredBadge || '',
                isConsumable: itemType === 'consumable'
            };

            if (itemType !== 'consumable' && newItem.style) {
                payload.style = newItem.style;
            }

            await firebaseService.addItem(classCode, payload);


            setNewItem({
                name: '',
                price: 0,
                imageUrl: '',
                isDonation: false,
                category: 'accessory',
                requiredLevel: 0,
                requiredBadge: '',
                style: { x: 0, y: 0, width: 100 }
            });
            setItemType('permanent');
            setImageFile(null);
            fetchItems(classCode);
            alert("아이템이 추가되었습니다!");
        } catch (error) {
            console.error("Failed to add item:", error);
            alert("아이템 추가에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItemParams = async (id: string) => {
        if (!classCode) return;
        try {
            await firebaseService.updateItem(classCode, id, { 
                price: editPrice,
                requiredLevel: editLevel
            });
            setEditingId(null);
            fetchItems(classCode);
        } catch (error) {
            alert("정보 수정 실패");
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        if (!classCode) return;

        try {
            await firebaseService.deleteItem(classCode, id);
            fetchItems(classCode);
        } catch (error) {
            alert("아이템 삭제 실패");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    const handleStudentClick = async (student: any) => {
        setSelectedStudent(student);
        if (classCode) {
            const logs = await firebaseService.getCookieLog(classCode, student.id);
            setStudentCookieLogs(logs);
        }
    };

    const handleProvideCookie = async () => {
        if (!classCode || !selectedStudent) return;
        if (rewardAmount <= 0) {
            alert("지급할 쿠키 수량을 입력하세요.");
            return;
        }
        setIsProvidingCookie(true);
        try {
            await firebaseService.provideCookies(classCode, selectedStudent.id, rewardAmount, rewardReason);
            alert("쿠키가 성공적으로 지급되었습니다.");
            setRewardAmount(0);
            setRewardReason('');
            const logs = await firebaseService.getCookieLog(classCode, selectedStudent.id);
            setStudentCookieLogs(logs);
        } catch (error) {
            alert("쿠키 지급 중 오류가 발생했습니다.");
        } finally {
            setIsProvidingCookie(false);
        }
    };

    const handleDownloadAvatar = async () => {
        if (!selectedStudent) return;
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw background
            ctx.fillStyle = '#eff6ff'; // bg-blue-50
            ctx.fillRect(0, 0, 400, 400);

            const eq = selectedStudent.equippedItems || {};
            const layers = [
                { type: 'background', url: eq.background?.imageUrl, style: eq.background?.style },
                { type: 'body', url: '/assets/avatar/base_body.png', style: null },
                { type: 'face', url: eq.face?.imageUrl, style: eq.face?.style },
                { type: 'hair', url: eq.hair?.imageUrl, style: eq.hair?.style },
                { type: 'outfit', url: eq.outfit?.imageUrl, style: eq.outfit?.style },
                { type: 'accessory', url: eq.accessory?.imageUrl, style: eq.accessory?.style },
            ];

            const validLayers = layers.filter(l => l.url);
            
            for (const layer of validLayers) {
                try {
                    const response = await fetch(getProxyImageUrl(layer.url!));
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    
                    await new Promise<void>((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const style = layer.style;
                            if (style && layer.type !== 'body' && layer.type !== 'background') {
                                const w = (style.width / 100) * 400;
                                const h = img.height * (w / img.width);
                                const x = (style.x / 100) * 400;
                                const y = (style.y / 100) * 400;
                                ctx.drawImage(img, x, y, w, h);
                            } else {
                                ctx.drawImage(img, 0, 0, 400, 400);
                            }
                            URL.revokeObjectURL(objectUrl);
                            resolve();
                        };
                        img.onerror = () => {
                            URL.revokeObjectURL(objectUrl);
                            resolve();
                        };
                        img.src = objectUrl;
                    });
                } catch (e) {
                    console.error("Failed to load image layer", e);
                }
            }

            const link = document.createElement('a');
            link.download = `${selectedStudent.name}_아바타.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error(err);
            alert("이미지 저장에 실패했습니다.");
        }
    };

    const handleKickStudent = async (studentId: string) => {
        if (!classCode) return;
        if (!confirm("정말 이 학생을 내보내시겠습니까? 삭제된 학생의 아바타 및 쿠키 데이터는 복구할 수 없습니다.")) return;

        try {
            await firebaseService.removeStudentFromClass(classCode, studentId);
            fetchStudents(classCode);
            alert("학생을 내보냈습니다.");
        } catch (error) {
            console.error(error);
            alert("내보내기 중 오류가 발생했습니다.");
        }
    };

    const handleKickAll = async () => {
        if (!classCode) return;
        if (!confirm("광장에 접속 중인 모든 학생을 강제로 내보내시겠습니까?\n\n(참고: 내보내진 학생은 자동으로 상점 화면으로 돌아갑니다.)")) return;

        try {
            await firebaseService.kickAllFromSquare(classCode);
            alert("모든 학생을 내보냈습니다.");
        } catch (error) {
            console.error(error);
            alert("내보내기 중 오류가 발생했습니다.");
        }
    };

    const handleDownloadChat = async () => {
        if (!classCode) return;
        try {
            const messages = await firebaseService.getAllChatMessages(classCode);
            if (messages.length === 0) {
                alert("다운로드할 대화록이 없습니다.");
                return;
            }

            // Create text content
            let content = `--- 다했니 광장 대화록 (${classCode}) ---\n\n`;
            messages.forEach(msg => {
                const date = msg.timestamp ? msg.timestamp.toDate() : new Date();
                const timeStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                content += `[${timeStr}] ${msg.studentName} (${msg.studentCode}): ${msg.message}\n`;
            });

            // Create blob and download link
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `광장대화록_${classCode}_${new Date().getTime()}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error(error);
            alert("대화록 저장 중 오류가 발생했습니다.");
        }
    };

    const handleToggleVisibility = async (itemId: string, currentHidden: boolean) => {
        if (!classCode) return;
        try {
            await firebaseService.toggleGlobalItemVisibility(classCode, itemId, !currentHidden);
            // Optimistic update or refetch
            setItems(prev => prev.map(item =>
                item.id === itemId ? { ...item, isHidden: !currentHidden } : item
            ));
        } catch (error) {
            console.error(error);
            alert("상태 변경 실패");
        }
    };

    const filteredItems = items.filter(item => {
        if (selectedCategory === 'all') return true;
        if (selectedCategory === 'consumable') return item.isConsumable === true;
        return item.category === selectedCategory && !item.isConsumable;
    });


    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 z-10 p-1 bg-white rounded-full transition-colors border shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        <div className="p-6 border-b text-center relative bg-gradient-to-b from-indigo-50 to-white">
                            <button
                                onClick={() => handleKickStudent(selectedStudent.id)}
                                className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm"
                                title="학생을 반에서 내보냅니다."
                            >
                                내보내기
                            </button>
                            
                            <div className="mx-auto w-40 h-40 mt-4 mb-4 bg-white rounded-[2rem] shadow-inner border border-gray-100 flex items-center justify-center relative group">
                                <AvatarDisplay equippedItems={selectedStudent.equippedItems || {}} size={150} />
                                <button 
                                    onClick={handleDownloadAvatar}
                                    className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg hover:bg-indigo-700 hover:scale-110 transition-all cursor-pointer z-10 border-2 border-white"
                                    title="PNG 이미지로 다운로드"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </button>
                            </div>
                            <h3 className="text-2xl font-black text-gray-800">{selectedStudent.name}</h3>
                            <p className="text-sm font-bold text-indigo-400 tracking-wider font-mono mt-1">{selectedStudent.studentCode}</p>
                        </div>
                        
                        <div className="p-6 bg-gray-50 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>🍪</span> 선생님 쿠키 선물하기
                                </h4>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="지급 사유 (예: 칭찬)"
                                        value={rewardReason}
                                        onChange={(e) => setRewardReason(e.target.value)}
                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="수량"
                                        value={rewardAmount || ''}
                                        onChange={(e) => setRewardAmount(Number(e.target.value))}
                                        className="w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-center"
                                        min="1"
                                    />
                                    <button 
                                        onClick={handleProvideCookie}
                                        disabled={isProvidingCookie || rewardAmount <= 0}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:bg-gray-300 disabled:shadow-none whitespace-nowrap"
                                    >
                                        지급
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>📜</span> 쿠키 내역 <span className="text-xs text-gray-400 font-normal">(최근 20건)</span>
                                </h4>
                                <div className="space-y-2">
                                    {studentCookieLogs.length === 0 ? (
                                        <p className="text-center text-sm text-gray-400 py-6 bg-white rounded-xl border border-dashed border-gray-200">사용 내역이 없습니다.</p>
                                    ) : (
                                        studentCookieLogs.map(log => (
                                            <div key={log.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                                        {log.type === 'purchase' ? '🛒' : log.type === 'donation' ? '❤️' : '🎁'}
                                                        {log.itemName || '알 수 없음'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(log.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className={`font-black ${log.type === 'reward' ? 'text-indigo-600' : 'text-orange-500'}`}>
                                                    {log.type === 'reward' ? '+' : '-'}{log.amount}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">🍪 다했니 상점 관리자</h1>
                        {className && <p className="text-gray-500 mt-1">접속 중인 학급: <span className="font-bold text-indigo-600">{className}</span></p>}
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </header>

                {classCode && classCode !== 'GLOBAL' && (
                    <div className="flex gap-4 mb-8 border-b pb-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('shop')}
                            className={`text-xl md:text-2xl font-bold transition-colors ${activeTab === 'shop' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            🛍️ 상점 관리
                        </button>
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`text-xl md:text-2xl font-bold transition-colors ${activeTab === 'students' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            👨‍🎓 우리 반 아바타 보기
                        </button>
                        <button
                            onClick={() => { 
                                setActiveTab('coupons'); 
                                setSelectedCouponId(null); 
                                setIsIssuingCoupon(false);
                                setUseSelectedStudents([]);
                                classCode && fetchCoupons(classCode); 
                            }}
                            className={`text-xl md:text-2xl font-bold transition-colors ${activeTab === 'coupons' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            🎟️ 쿠폰 관리
                        </button>
                        <button
                            onClick={() => setActiveTab('square')}
                            className={`text-xl md:text-2xl font-bold transition-colors ${activeTab === 'square' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            🌳 광장 관리
                        </button>
                    </div>
                )}

                {activeTab === 'shop' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Item Form & Preview Section - Only allow adding if not global view or admin */}
                        {/* Actually, everyone can add items. Admin adds to global, Teacher adds to local. */}
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Left: Add Item Form */}
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">
                                    {classCode === 'GLOBAL' ? '공통 아이템 추가' : '우리 반 아이템 추가'}
                                </h2>
                                <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setItemType('permanent')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${itemType === 'permanent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        ✨ 아바타 꾸미기 (영구)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setItemType('consumable')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${itemType === 'consumable' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        🎟️ 쿠폰 / 소모품
                                    </button>
                                </div>
                                <form onSubmit={handleAddItem} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">아이템 이름</label>
                                        <input
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="예: 멋진 선글라스"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">가격 (쿠키)</label>
                                            <input
                                                type="number"
                                                value={newItem.price}
                                                onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">구매 가능 레벨</label>
                                            <input
                                                type="number"
                                                value={newItem.requiredLevel || 0}
                                                onChange={(e) => setNewItem({ ...newItem, requiredLevel: Number(e.target.value) })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">필요 뱃지 (이름)</label>
                                        <input
                                            type="text"
                                            value={newItem.requiredBadge || ''}
                                            onChange={(e) => setNewItem({ ...newItem, requiredBadge: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="예: 독서왕"
                                        />
                                    </div>

                                    {itemType === 'permanent' && (
                                        <>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                                                <select
                                                    value={newItem.category || 'accessory'}
                                                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                >
                                                    <option value="background">배경 (Background)</option>
                                                    <option value="hair">헤어 (Hair)</option>
                                                    <option value="face">얼굴 (Face)</option>
                                                    <option value="outfit">의상 (Outfit)</option>
                                                    <option value="accessory">액세서리 (Accessory)</option>
                                                    <option value="others">기타 (Others)</option>
                                                </select>
                                            </div>

                                            {/* Positioning Inputs */}
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <h3 className="text-sm font-bold text-gray-700 mb-3">📍 아이템 위치/크기 조정</h3>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">X 위치 (%)</label>
                                                        <input
                                                            type="number"
                                                            value={newItem.style?.x || 0}
                                                            onChange={(e) => setNewItem({ ...newItem, style: { ...newItem.style!, x: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Y 위치 (%)</label>
                                                        <input
                                                            type="number"
                                                            value={newItem.style?.y || 0}
                                                            onChange={(e) => setNewItem({ ...newItem, style: { ...newItem.style!, y: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">크기 (%)</label>
                                                        <input
                                                            type="number"
                                                            value={newItem.style?.width || 100}
                                                            onChange={(e) => setNewItem({ ...newItem, style: { ...newItem.style!, width: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">아이템 이미지</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files ? e.target.files[0] : null;
                                                setImageFile(file);
                                                if (file) {
                                                    const objectUrl = URL.createObjectURL(file);
                                                    setNewItem(prev => ({ ...prev, imageUrl: objectUrl }));
                                                }
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="isDonation"
                                            checked={newItem.isDonation || false}
                                            onChange={(e) => setNewItem({ ...newItem, isDonation: e.target.checked })}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="isDonation" className="ml-2 block text-sm text-gray-900">
                                            기부하기 아이템
                                        </label>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {loading ? '등록 중...' : '아이템 등록하기'}
                                    </button>
                                </form>
                            </div>

                            {/* Right: Avatar Preview */}
                            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center sticky top-8">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">착용 미리보기</h2>
                                <div className="mb-6">
                                    <AvatarDisplay
                                        equippedItems={
                                            newItem.category && newItem.category !== 'others'
                                                ? { [newItem.category]: newItem as ShopItem }
                                                : {}
                                        }
                                        size={250}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Item List */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">등록된 아이템 목록 ({filteredItems.length})</h2>

                                {/* Category Filter Tabs */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id as any)}
                                            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedCategory === cat.id
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {filteredItems.map((item) => {

                                        const isGlobalItem = item.isGlobal && classCode !== 'GLOBAL';
                                        const isHidden = item.isHidden;

                                        return (
                                            <div
                                                key={item.id}
                                                className={`border rounded-lg p-4 hover:shadow-md transition-shadow bg-white ${isGlobalItem ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} ${isHidden ? 'opacity-60' : ''}`}
                                            >
                                                <div className="aspect-square bg-gray-100 rounded-md mb-3 overflow-hidden relative group">
                                                    {item.imageUrl ? (
                                                        <img src={getProxyImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-400 text-4xl">🍪</div>
                                                    )}
                                                    {isGlobalItem && (
                                                        <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                                                            공통
                                                        </span>
                                                    )}
                                                    {isHidden && (
                                                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                                                            <span className="text-white font-bold bg-gray-800 px-3 py-1 rounded-full">숨김 처리됨</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-gray-800">{item.name}</h3>
                                                        {item.category && (
                                                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 mr-1 ${isGlobalItem ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                                                {item.category}
                                                            </span>
                                                        )}
                                                        {item.requiredLevel && item.requiredLevel > 0 && (
                                                            <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1 bg-yellow-100 text-yellow-700 mr-1">
                                                                Lv. {item.requiredLevel}
                                                            </span>
                                                        )}
                                                        {item.requiredBadge && (
                                                            <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1 bg-purple-100 text-purple-700">
                                                                🏅 {item.requiredBadge}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        {/* If it's a global item seen by a teacher, show Toggle Hide */}
                                                        {isGlobalItem ? (
                                                            <button
                                                                onClick={() => item.id && handleToggleVisibility(item.id, !!isHidden)}
                                                                className={`text-xs font-bold px-2 py-1 rounded border ${isHidden ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                                            >
                                                                {isHidden ? '보이기' : '숨기기'}
                                                            </button>
                                                        ) : (
                                                            // Local item or Admin view: Show Delete
                                                            <button
                                                                onClick={() => item.id && handleDeleteItem(item.id)}
                                                                className="text-red-400 hover:text-red-600 text-sm"
                                                            >
                                                                삭제
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price Edit - Only for Local items or Admin */}
                                                {(!isGlobalItem || classCode === 'GLOBAL') && (
                                                    <>
                                                        {editingId === item.id ? (
                                                            <div className="flex flex-col gap-2 mt-2 bg-gray-50 border rounded p-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500 w-8">가격:</span>
                                                                    <input
                                                                        type="number"
                                                                        value={editPrice}
                                                                        onChange={(e) => setEditPrice(Number(e.target.value))}
                                                                        className="w-16 px-2 py-1 border rounded text-sm"
                                                                        min="0"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500 w-8">레벨:</span>
                                                                    <input
                                                                        type="number"
                                                                        value={editLevel}
                                                                        onChange={(e) => setEditLevel(Number(e.target.value))}
                                                                        className="w-16 px-2 py-1 border rounded text-sm"
                                                                        min="0"
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2 justify-end mt-1">
                                                                    <button
                                                                        onClick={() => item.id && handleUpdateItemParams(item.id)}
                                                                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors"
                                                                    >
                                                                        저장
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingId(null)}
                                                                        className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                                                                    >
                                                                        취소
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-center mt-2">
                                                                <span className="text-orange-600 font-bold">🍪 {item.price}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(item.id || null);
                                                                        setEditPrice(item.price);
                                                                        setEditLevel(item.requiredLevel || 0);
                                                                    }}
                                                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                                                >
                                                                    수정
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}


                                                {/* Price Display for Global Item seen by Teacher (Read Only) */}
                                                {isGlobalItem && (
                                                    <div className="mt-2">
                                                        <span className="text-orange-600 font-bold">🍪 {item.price}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'students' ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <div className="mb-6 border-b pb-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                우리 반 학생 목록 ({students.length}명)
                            </h2>
                            <button
                                onClick={() => classCode && fetchStudents(classCode)}
                                className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md text-sm font-bold hover:bg-indigo-100 transition-colors"
                            >
                                새로고침
                            </button>
                        </div>

                        {students.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p>학생 데이터가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {students.map((student) => (
                                    <div key={student.id} 
                                         onClick={() => handleStudentClick(student)}
                                         className="relative flex flex-col items-center bg-gray-50 border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                                        <div className="mb-3 transform group-hover:scale-110 transition-transform duration-300">
                                            <AvatarDisplay equippedItems={student.equippedItems || {}} size={120} />
                                        </div>
                                        <span className="font-bold text-gray-700 text-lg group-hover:text-indigo-600 transition-colors">{student.name || '이름 없음'}</span>
                                        {student.studentCode && (
                                            <span className="text-xs text-gray-400 mt-1">학번: {student.studentCode}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'coupons' ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <div className="mb-6 border-b pb-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                {selectedCouponId && (
                                    <button
                                        onClick={() => setSelectedCouponId(null)}
                                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                        title="뒤로 가기"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                )}
                                <h2 className="text-xl font-bold text-gray-800">
                                    {selectedCouponId ? `${items.find(i => i.id === selectedCouponId)?.name || '쿠폰'} 보유 학생 전체보기` : '쿠폰(소모성 아이템) 목록'}
                                </h2>
                            </div>
                            <div className="flex gap-2">
                                {!selectedCouponId && (
                                    <button
                                        onClick={() => setIsIssuingCoupon(!isIssuingCoupon)}
                                        className={`px-3 py-1 rounded-md text-sm font-bold transition-colors ${isIssuingCoupon ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                    >
                                        {isIssuingCoupon ? '취소' : '🎁 쿠폰 일괄 지급'}
                                    </button>
                                )}
                                <button
                                    onClick={() => classCode && fetchCoupons(classCode)}
                                    className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md text-sm font-bold hover:bg-emerald-100 transition-colors"
                                >
                                    새로고침
                                </button>
                            </div>
                        </div>

                        {/* 쿠폰 발급 UI */}
                        {isIssuingCoupon && !selectedCouponId && (
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-6">
                                <h3 className="text-lg font-bold text-indigo-800 mb-4">🎁 쿠폰 일괄 지급하기</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 대상 쿠폰 선택 */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">어떤 쿠폰을 지급할까요?</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {items.filter(item => item.isConsumable && !item.isHidden).map(coupon => (
                                                <button
                                                    key={coupon.id}
                                                    onClick={() => setIssueSelectedCoupon(coupon.id!)}
                                                    className={`p-3 text-left border rounded-lg transition-all text-sm font-medium ${
                                                        issueSelectedCoupon === coupon.id 
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                                        : 'bg-white text-gray-700 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    {coupon.name}
                                                </button>
                                            ))}
                                            {items.filter(item => item.isConsumable && !item.isHidden).length === 0 && (
                                                <p className="text-sm text-gray-500 col-span-2">등록된 쿠폰이 없습니다.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 지급 대상 학생 선택 */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-bold text-gray-700">누구에게 지급할까요?</label>
                                            <button 
                                                onClick={() => {
                                                    if (issueSelectedStudents.length === students.length) {
                                                        setIssueSelectedStudents([]);
                                                    } else {
                                                        setIssueSelectedStudents(students.map(s => s.id));
                                                    }
                                                }}
                                                className="text-xs text-indigo-600 font-bold hover:underline"
                                            >
                                                {issueSelectedStudents.length === students.length ? '전체 해제' : '전체 선택'}
                                            </button>
                                        </div>
                                        <div className="bg-white border rounded-lg p-3 max-h-[200px] overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar">
                                            {students.map(student => (
                                                <label key={student.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={issueSelectedStudents.includes(student.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setIssueSelectedStudents(prev => [...prev, student.id]);
                                                            } else {
                                                                setIssueSelectedStudents(prev => prev.filter(id => id !== student.id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm">
                                                        {student.name} <span className="text-xs text-gray-400">({student.studentCode})</span>
                                                    </span>
                                                </label>
                                            ))}
                                            {students.length === 0 && (
                                                <p className="text-sm text-gray-500 col-span-2 text-center py-2">학생 데이터가 없습니다.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <button
                                        onClick={handleIssueCoupons}
                                        disabled={loadingCoupons || !issueSelectedCoupon || issueSelectedStudents.length === 0}
                                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-md transition-colors ${
                                            loadingCoupons || !issueSelectedCoupon || issueSelectedStudents.length === 0
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                        }`}
                                    >
                                        선택한 {issueSelectedStudents.length}명에게 일괄 지급하기
                                    </button>
                                </div>
                            </div>
                        )}

                        {loadingCoupons ? (
                            <div className="text-center py-12 text-gray-500">불러오는 중...</div>
                        ) : !selectedCouponId ? (
                            // 쿠폰 종류 목록 표시
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {items.filter(item => item.isConsumable && !item.isHidden).length === 0 ? (
                                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        <p>등록된 쿠폰이 없어요.</p>
                                    </div>
                                ) : (
                                    items.filter(item => item.isConsumable && !item.isHidden).map(coupon => (
                                        <button
                                            key={coupon.id}
                                            onClick={() => setSelectedCouponId(coupon.id!)}
                                            className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-emerald-300 transition-all text-center group"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center overflow-hidden group-hover:bg-emerald-100 transition-colors">
                                                {coupon.imageUrl ? (
                                                    <img src={getProxyImageUrl(coupon.imageUrl)} alt={coupon.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl">🎟️</span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{coupon.name}</h3>
                                                <p className="text-xs text-gray-500 mt-1">상세 보기 &rarr;</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            // 특정 쿠폰 보유 학생 목록
                            <div className="flex flex-col gap-4">
                                {(() => {
                                    // 해당 쿠폰을 가진 학생 필터링
                                    const studentsWithCoupon = couponsData
                                        .map(({ student, items }) => ({
                                            student,
                                            couponItem: items.find(i => i.id === selectedCouponId)
                                        }))
                                        .filter(data => data.couponItem && data.couponItem.quantity! > 0);

                                    if (studentsWithCoupon.length === 0) {
                                        return (
                                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                <p>이 쿠폰을 보유한 학생이 없습니다.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <>
                                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <label className="flex items-center gap-2 cursor-pointer pl-2">
                                                    <input 
                                                        type="checkbox"
                                                        checked={useSelectedStudents.length === studentsWithCoupon.length && studentsWithCoupon.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setUseSelectedStudents(studentsWithCoupon.map(s => s.student.id));
                                                            } else {
                                                                setUseSelectedStudents([]);
                                                            }
                                                        }}
                                                        className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                                    />
                                                    <span className="font-bold text-gray-700">전체 선택 ({useSelectedStudents.length}/{studentsWithCoupon.length})</span>
                                                </label>
                                                
                                                {useSelectedStudents.length > 0 && (
                                                    <button
                                                        onClick={handleBulkUseCoupons}
                                                        className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm"
                                                    >
                                                        선택 학생 {useSelectedStudents.length}명 일괄 사용 완료 처리
                                                    </button>
                                                )}
                                            </div>

                                            {studentsWithCoupon.map(({ student, couponItem }) => (
                                                <div key={student.id} className="border border-gray-200 rounded-lg p-4 bg-white flex items-center justify-between shadow-sm hover:border-emerald-300 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <label className="cursor-pointer p-2 flex shrink-0">
                                                            <input 
                                                                type="checkbox"
                                                                checked={useSelectedStudents.includes(student.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setUseSelectedStudents(prev => [...prev, student.id]);
                                                                    } else {
                                                                        setUseSelectedStudents(prev => prev.filter(id => id !== student.id));
                                                                    }
                                                                }}
                                                                className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                                            />
                                                        </label>
                                                        <div className="w-12 h-12 bg-gray-50 rounded-full border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                                            <AvatarDisplay equippedItems={student.equippedItems || {}} size={40} />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-800 text-lg">{student.name || '이름 없음'}</h3>
                                                            {student.studentCode && <p className="text-xs text-gray-500">학번: {student.studentCode}</p>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6 pr-2">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm text-gray-500 font-medium">보유 수량</span>
                                                            <span className="text-xl font-bold text-emerald-600">{couponItem!.quantity || 1}<span className="text-sm text-gray-500 ml-1">개</span></span>
                                                        </div>
                                                        <button
                                                            onClick={() => couponItem!.id && handleUseCoupon(student.id, couponItem!.id)}
                                                            className="px-3 py-2 bg-gray-100 text-gray-700 font-bold rounded flex items-center gap-1 hover:bg-gray-200 transition-colors text-sm shrink-0"
                                                        >
                                                            <span className="text-emerald-600">&minus;1</span> 사용
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'square' ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <div className="mb-6 border-b pb-4">
                            <h2 className="text-xl font-bold text-gray-800">🌳 광장 관리</h2>
                            <p className="text-sm text-gray-500 mt-1">우리 반 광장의 배경과 접속 중인 학생들을 관리합니다.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* 접속 중인 학생 현황 및 컨트롤 */}
                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                                        <span className="shrink-0">현재 접속 중인 학생 🙋‍♂️</span>
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap shrink-0">
                                            총 {squareParticipants.length}명
                                        </span>
                                    </h3>
                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-3 sm:mt-0 justify-end">
                                        <button
                                            onClick={handleDownloadChat}
                                            className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition-colors shadow-sm text-sm flex justify-center items-center gap-1 whitespace-nowrap shrink-0"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            대화목록 다운로드
                                        </button>
                                        <button
                                            onClick={handleKickAll}
                                            className="flex-1 sm:flex-none px-3 py-1.5 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition-colors shadow-sm text-sm whitespace-nowrap shrink-0"
                                        >
                                            학생 전체 내보내기
                                        </button>
                                    </div>
                                </div>

                                {squareParticipants.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-200 flex-1 flex items-center justify-center">
                                        현재 광장에 접속한 학생이 없습니다.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {squareParticipants.map(user => (
                                            <div key={user.studentCode} className="bg-white p-3 rounded-lg border border-gray-100 flex flex-col items-center justify-center gap-2 shadow-sm">
                                                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                                                    <AvatarDisplay equippedItems={user.avatarConfig || {}} size={40} />
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-gray-800 text-sm">{user.name}</div>
                                                    <div className="text-xs text-gray-400">{user.studentCode}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 광장 배경 설정 */}
                            <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">광장 배경 설정 🖼️</h3>
                                <p className="text-sm text-gray-600 mb-4 bg-white p-2 rounded border border-blue-50">
                                    원하는 배경을 클릭하면 학생들이 접속해 있는 광장의 배경이 <strong>실시간으로 변경</strong>됩니다.<br />
                                    <span className="text-xs text-gray-400 mt-1 block">(* 0~5번 배경 이미지가 준비되어 있습니다)</span>
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    {['bg0.png', 'bg1.png', 'bg2.png', 'bg3.png', 'bg4.png', 'bg5.png'].map((bgPath, idx) => (
                                        <button
                                            key={bgPath}
                                            onClick={() => {
                                                if (classCode) firebaseService.updateSquareConfig(classCode, { background: bgPath });
                                            }}
                                            className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${squareConfig.background === bgPath
                                                ? 'border-blue-500 shadow-md ring-2 ring-blue-200 ring-offset-1'
                                                : 'border-transparent hover:border-blue-300 opacity-70 hover:opacity-100'
                                                }`}
                                        >
                                            {/* Dummy thumbnail to represent backgrounds before they physically exist */}
                                            {squareConfig.background === bgPath && (
                                                <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-sm">
                                                    현재 적용됨
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg">
                                                배경 {idx}
                                            </div>
                                            {/* Actual Image if it exists */}
                                            <div
                                                className="absolute inset-0 bg-cover bg-center"
                                                style={{ backgroundImage: `url('/images/square/${bgPath}')` }}
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-white text-xs font-medium text-center backdrop-blur-sm">
                                                {bgPath}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Floating Action Buttons */}
            <div className="fixed right-6 bottom-6 flex flex-col gap-3 z-50">
                <a
                    href="https://www.instagram.com/daejibubu_ssam?igsh=MTVkMHJnZ24ycGsybw%3D%3D&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex text-center items-center justify-center w-48 px-4 py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                >
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold opacity-80 leading-tight">개발자 선생님(대지부부)</span>
                        <span className="font-bold text-sm leading-tight mt-0.5">인스타그램</span>
                    </div>
                </a>
                <a
                    href="https://open.kakao.com/o/gGA6nnhi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex text-center items-center justify-center w-48 px-4 py-3 bg-[#FEE500] text-black rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                >
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold opacity-80 leading-tight">다했니 월드 사용자를 위한</span>
                        <span className="font-bold text-sm leading-tight mt-0.5">오픈채팅방</span>
                    </div>
                </a>
            </div>
        </div>
    );
}
