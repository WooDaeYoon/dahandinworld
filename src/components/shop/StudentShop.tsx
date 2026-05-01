'use client';

import { useState, useEffect } from 'react';
import { firebaseService, ShopItem, Thermometer } from '@/lib/firebase/core';
import { dahandinClient } from '@/lib/dahandin/client';
import { DahandinBadge } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import AvatarDisplay from './AvatarDisplay';
import { getProxyImageUrl } from '@/lib/utils';

export default function StudentShop() {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [cookies, setCookies] = useState<number>(0);
    const [totalAccumulatedCookies, setTotalAccumulatedCookies] = useState<number>(0); // For Level
    const [usedCookies, setUsedCookies] = useState<number>(0); // Shadow Balance
    const [donatedCookies, setDonatedCookies] = useState<number>(0);
    const [loveTemperature, setLoveTemperature] = useState<number>(0);
    const [studentName, setStudentName] = useState('');
    const [studentCode, setStudentCode] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [classCode, setClassCode] = useState('');
    
    // Thermometer State
    const [thermometers, setThermometers] = useState<Thermometer[]>([]);

    const [inventory, setInventory] = useState<ShopItem[]>([]);
    const [equippedItems, setEquippedItems] = useState<Record<string, ShopItem>>({});
    const [badges, setBadges] = useState<Record<string, DahandinBadge>>({});
    const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'background' | 'hair' | 'face' | 'outfit' | 'accessory' | 'cookie' | 'others'>('all');

    const categories = [
        { id: 'all', label: '전체' },
        { id: 'background', label: '배경' },
        { id: 'cookie', label: '쿠키맛' },
        { id: 'face', label: '얼굴' },
        { id: 'hair', label: '헤어' },
        { id: 'outfit', label: '의상' },
        { id: 'accessory', label: '액세서리' },
        { id: 'others', label: '기타' },
    ];


    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [selectedThermometerId, setSelectedThermometerId] = useState<string>('');

    // Hover State (for Shop Only)
    const [hoveredItem, setHoveredItem] = useState<ShopItem | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // Load user info from localStorage
        const storedApiKey = localStorage.getItem('apiKey');
        const storedStudentCode = localStorage.getItem('studentCode');
        const storedStudentName = localStorage.getItem('studentName');
        const storedCookies = localStorage.getItem('studentCookie');
        const storedClassCode = localStorage.getItem('classCode');

        console.log("StudentShop Mount - LocalStorage:", {
            apiKey: storedApiKey,
            studentCode: storedStudentCode,
            name: storedStudentName,
            classCode: storedClassCode
        });

        if (storedApiKey) setApiKey(storedApiKey);
        if (storedStudentCode) setStudentCode(storedStudentCode);
        if (storedStudentName) setStudentName(storedStudentName);
        if (storedCookies) setCookies(Number(storedCookies));
        if (storedClassCode) setClassCode(storedClassCode);

        // Fetch data if we have necessary info
        if (storedClassCode) {
            fetchItems(storedClassCode);
            fetchGlobalStats(storedClassCode);
            fetchThermometers(storedClassCode);
        }

        if (storedStudentCode && storedClassCode && storedApiKey) {
            fetchLatestCookies(storedStudentCode, storedApiKey, storedClassCode);
            fetchUsedCookies(storedStudentCode, storedClassCode);
            fetchInventory(storedStudentCode, storedClassCode);
            fetchEquippedItems(storedStudentCode, storedClassCode);
            fetchStudentStats(storedStudentCode, storedClassCode);
        } else {
            if (!storedClassCode) console.error("No class code found in localStorage");
        }
    }, []);

    const fetchLatestCookies = async (code: string, key: string, cCode: string) => {
        try {
            const response = await dahandinClient.getStudentTotal(code, key);
            if (response.result && response.data) {
                // Swap: cookie is Total (120), totalCookie is Remaining (106) based on user feedback
                setCookies(response.data.totalCookie);
                setTotalAccumulatedCookies(response.data.cookie);
                setBadges(response.data.badges || {});
                localStorage.setItem('studentCookie', response.data.totalCookie.toString());

                // Sync Name to Firestore
                await firebaseService.syncStudentData(cCode, code, response.data.name);
            }
        } catch (error) {
            console.error("Failed to fetch latest cookies:", error);
        }
    };

    const fetchUsedCookies = async (code: string, cCode: string) => {
        try {
            const used = await firebaseService.getUsedCookies(cCode, code);
            setUsedCookies(used);
        } catch (error) {
            console.error("Failed to fetch used cookies:", error);
        }
    };

    const fetchItems = async (cCode: string) => {
        setLoading(true);
        try {
            const fetchedItems = await firebaseService.getShopItems(cCode);
            // Filter out hidden items for students
            setItems(fetchedItems.filter(item => !item.isHidden));
        } catch (error) {
            console.error("Failed to fetch items:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async (code: string, cCode: string) => {
        try {
            const userInventory = await firebaseService.getStudentInventory(cCode, code);
            setInventory(userInventory);
        } catch (error) {
            console.error("Failed to fetch inventory:", error);
        }
    };

    const fetchEquippedItems = async (code: string, cCode: string) => {
        try {
            const equipped = await firebaseService.getEquippedItems(cCode, code);
            setEquippedItems(equipped);
        } catch (error) {
            console.error("Failed to fetch equipped items:", error);
        }
    };

    const fetchGlobalStats = async (cCode: string) => {
        const temp = await firebaseService.getLoveTemperature(cCode);
        setLoveTemperature(temp);
    };

    const fetchThermometers = async (cCode: string) => {
        const list = await firebaseService.getThermometers(cCode);
        setThermometers(list);
    };

    const fetchStudentStats = async (code: string, cCode: string) => {
        const donated = await firebaseService.getStudentDonation(cCode, code);
        setDonatedCookies(donated);
    };

    const initiatePurchase = (item: ShopItem) => {
        const realCookies = cookies - usedCookies;
        if (realCookies < item.price) {
            alert("쿠키가 부족합니다!");
            return;
        }
        setSelectedItem(item);
        if (item.isDonation && thermometers.length > 0) {
            setSelectedThermometerId(thermometers[0].id!);
        } else {
            setSelectedThermometerId('');
        }
        setIsModalOpen(true);
    };

    const confirmPurchase = async () => {
        if (!selectedItem || !classCode) return;

        const item = selectedItem;
        setIsModalOpen(false);
        setSelectedItem(null);

        // Optimistic update for Shadow Balance
        setUsedCookies(prev => prev + item.price);

        try {
            if (item.isDonation) {
                await firebaseService.recordDonation(classCode, studentCode, item.price);
                
                if (thermometers.length > 0 && selectedThermometerId) {
                    const targetThermometer = thermometers.find(t => t.id === selectedThermometerId);
                    if (targetThermometer) {
                        await firebaseService.increaseThermometer(classCode, targetThermometer.id!, item.price, targetThermometer.cookiesPerDegree, studentCode);
                        fetchThermometers(classCode);
                        alert(`기부해주셔서 감사합니다! ${targetThermometer.name}의 온도가 올라갔습니다.`);
                    }
                } else {
                    await firebaseService.increaseLoveTemperature(classCode, item.price);
                    fetchGlobalStats(classCode);
                    alert(`기부해주셔서 감사합니다! 사랑의 온도가 ${(item.price * 0.01).toFixed(1)}도 올랐습니다.`);
                }
                
                await firebaseService.recordTransaction(classCode, studentCode, item.price, 'donation', undefined, '기부');
                fetchStudentStats(studentCode, classCode);
            } else {
                await firebaseService.purchaseItem(classCode, studentCode, item);
                await firebaseService.recordTransaction(classCode, studentCode, item.price, 'purchase', item.id, item.name);

                fetchInventory(studentCode, classCode);
            }
        } catch (error) {
            console.error("Purchase failed:", error);
            alert("구매 처리 중 오류가 발생했습니다.");
            // Rollback cookie update if possible, or just re-fetch
            if (apiKey && classCode) fetchLatestCookies(studentCode, apiKey, classCode);
        }
    };

    const handleEquip = async (item: ShopItem) => {
        if (!classCode || !item.category) return;

        try {
            const isEquipped = equippedItems[item.category]?.id === item.id;

            if (isEquipped) {
                // Unequip
                await firebaseService.unequipItem(classCode, studentCode, item.category);
                setEquippedItems(prev => {
                    const next = { ...prev };
                    delete next[item.category!];
                    return next;
                });
            } else {
                // Equip
                await firebaseService.equipItem(classCode, studentCode, item);
                setEquippedItems(prev => ({
                    ...prev,
                    [item.category!]: item
                }));
            }
        } catch (error) {
            console.error("Failed to toggle equip:", error);
            alert("장착 변경에 실패했습니다.");
        }
    };

    const handleDownloadAvatar = async () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw background
            ctx.fillStyle = '#eff6ff'; // bg-blue-50
            ctx.fillRect(0, 0, 400, 400);

            const eq = equippedItems || {};
            const layers = [
                { type: 'background', url: eq.background?.imageUrl, style: eq.background?.style },
                { type: 'body', url: '/assets/avatar/base_body.png', style: null },
                { type: 'cookie', url: eq.cookie?.imageUrl, style: eq.cookie?.style },
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
            link.download = `${studentName}_내캐릭터.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error(err);
            alert("이미지 저장에 실패했습니다.");
        }
    };

    // Level calculation
    const realCookies = cookies - usedCookies;
    // Level is based on TOTAL cookies earned (from API), not current balance.
    const level = Math.floor(totalAccumulatedCookies / 10);

    const filteredItems = items
        .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
        .sort((a, b) => {
            const aIsGlobal = a.isGlobal ? 1 : 0;
            const bIsGlobal = b.isGlobal ? 1 : 0;
            return bIsGlobal - aIsGlobal;
        });
    const filteredInventory = inventory.filter(item => selectedCategory === 'all' || item.category === selectedCategory);


    const handleLogout = () => {
        const cache = localStorage.getItem('studentLoginCache');
        localStorage.clear(); // Clear all
        if (cache) localStorage.setItem('studentLoginCache', cache);
        window.location.href = '/login';
    };

    if (!classCode) {
        return <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">학급 정보가 없습니다.</h2>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    다시 로그인하기
                </button>
            </div>
        </div>
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8"
             onMouseMove={(e) => {
                 if (hoveredItem) {
                     setMousePos({ x: e.clientX, y: e.clientY });
                 }
             }}
        >
            <ConfirmModal
                isOpen={isModalOpen}
                title={selectedItem?.isDonation ? "기부하기" : "아이템 구매"}
                message={selectedItem?.isDonation ? `${selectedItem?.name}을(를) 기부하시겠습니까?` : `${selectedItem?.name}을(를) 구매하시겠습니까?`}
                onConfirm={confirmPurchase}
                onCancel={() => setIsModalOpen(false)}
            >
                {selectedItem?.isDonation && thermometers.length > 0 && (
                    <div className="mt-2 text-left">
                        <label className="block text-sm font-bold text-gray-700 mb-2">어느 온도계에 기부할까요?</label>
                        <select
                            value={selectedThermometerId}
                            onChange={(e) => setSelectedThermometerId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {thermometers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} (목표: {t.targetDegree}도)</option>
                            ))}
                        </select>
                    </div>
                )}
            </ConfirmModal>

            {/* Floating Tooltip for Shop Item Hover */}
            {hoveredItem && activeTab === 'shop' && (
                <div 
                    className="fixed pointer-events-none z-50 animate-fade-in-up"
                    style={{ 
                        left: `${mousePos.x + 15}px`, 
                        top: `${mousePos.y + 15}px`,
                        transform: 'translate(0, 0)' // Always attach relative to cursor directly
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-[0_10px_40px_-5px_rgba(0,0,0,0.3)] border-2 border-indigo-100 p-6 flex flex-col items-center relative">
                        {/* Speech bubble tail */}
                        <div className="absolute -left-2 top-4 w-4 h-4 bg-white border-l-2 border-t-2 border-indigo-100 transform -rotate-45"></div>
                        <h4 className="text-sm font-bold text-gray-700 mb-4 whitespace-nowrap">장착 모습</h4>
                        <AvatarDisplay 
                            equippedItems={{
                                [hoveredItem.category || '']: hoveredItem // 장착된 템은 비우고 호버중인 단일템만
                            }} 
                            size={120} 
                        />
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Left Side: Character & Status */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Character Section */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">내 캐릭터</h2>
                        <div className="mb-4 relative group">
                            <AvatarDisplay equippedItems={equippedItems} size={200} />
                            <button 
                                onClick={handleDownloadAvatar}
                                className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg hover:bg-indigo-700 hover:scale-110 transition-all cursor-pointer z-10 border-2 border-white"
                                title="PNG 이미지로 다운로드"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            </button>
                        </div>
                        <p className="text-gray-500 text-sm">아이템을 장착하여 꾸며보세요!</p>
                    </div>

                    {/* Status Window */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">상태창</h2>

                        <div className="space-y-4">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">이름</div>
                                <div className="font-bold text-lg">{studentName}</div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-500 mb-1">레벨</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-indigo-600">Lv. {level}</span>
                                    <span className="text-xs text-gray-400">(총 {totalAccumulatedCookies} 쿠키)</span>
                                </div>
                            </div>

                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                <div className="text-sm text-orange-600 mb-1 font-medium">사용 가능한 쿠키</div>
                                <div className="text-2xl font-bold text-orange-700">🍪 {realCookies}</div>
                            </div>

                            <div className="bg-pink-50 p-3 rounded-xl border border-pink-100">
                                <div className="text-sm text-pink-600 mb-1 font-medium">기부한 쿠키</div>
                                <div className="text-2xl font-bold text-pink-700">❤️ {donatedCookies}</div>
                            </div>
                        </div>
                    </div>

                    {/* Badge List */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center justify-between">
                            <span>내 뱃지</span>
                            <span className="text-sm font-normal text-gray-500">{Object.values(badges).filter(b => b.hasBadge).length}개</span>
                        </h2>
                        <div className="grid grid-cols-4 gap-2">
                            {Object.values(badges).filter(b => b.hasBadge).length === 0 ? (
                                <p className="col-span-4 text-center text-gray-400 text-sm py-4">보유한 뱃지가 없습니다.</p>
                            ) : (
                                Object.values(badges).filter(b => b.hasBadge).map((badge, idx) => (
                                    <div key={idx} className="flex flex-col items-center" title={badge.title}>
                                        <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center border border-yellow-200 mb-1 overflow-hidden">
                                            {badge.imgUrl ? (
                                                <img src={getProxyImageUrl(badge.imgUrl)} alt={badge.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg">🏅</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-600 text-center truncate w-full">{badge.title}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Love Temperature (Global / Class) */}
                    {thermometers.length > 0 ? (
                        <div className="space-y-4">
                            {thermometers.map((t, idx) => (
                                <div key={t.id || idx} className="bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl shadow-lg p-6 text-white">
                                    <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                                        <span>🌡️</span> {t.name}
                                    </h2>
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="text-4xl font-black">{t.currentDegree.toFixed(1)}°C</div>
                                        <div className="text-sm font-bold text-white/90">목표: {t.targetDegree}°C</div>
                                    </div>
                                    <div className="w-full bg-white/30 rounded-full h-2">
                                        <div
                                            className="bg-white h-2 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min((t.currentDegree / t.targetDegree) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs mt-2 text-white/80">친구들과 함께 기부하여 목표를 달성하세요!</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
                            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <span>🌡️</span> 쿠키월드 사랑의 온도
                            </h2>
                            <div className="text-4xl font-black mb-2">{loveTemperature.toFixed(1)}°C</div>
                            <div className="w-full bg-white/30 rounded-full h-2">
                                <div
                                    className="bg-white h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(loveTemperature, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs mt-2 text-white/80">친구들의 기부로 온도가 올라갑니다!</p>
                        </div>
                    )}
                </div>

                {/* Right Side: Shop & Inventory */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 min-h-[600px]">
                        <header className="mb-6 flex justify-between items-center border-b pb-4">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveTab('shop')}
                                    className={`text-2xl font-bold transition-colors ${activeTab === 'shop' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    🍪 상점
                                </button>
                                <button
                                    onClick={() => setActiveTab('inventory')}
                                    className={`text-2xl font-bold transition-colors ${activeTab === 'inventory' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    🎒 보관함
                                </button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-gray-500 hidden sm:block">
                                    {activeTab === 'shop' ? '원하는 아이템을 구매해보세요!' : '내가 보유한 아이템 목록입니다.'}
                                </div>
                                <button
                                    onClick={() => window.open('https://woodaeyoon.github.io/pixelmaker/', '_blank')}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors flex items-center gap-1"
                                >
                                    <span>🎨</span> 아이템 만들기
                                </button>
                                <button
                                    onClick={() => window.location.href = '/square'}
                                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold hover:bg-green-200 transition-colors flex items-center gap-1"
                                >
                                    <span>🌳</span> 광장 가기
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                                >
                                    로그아웃
                                </button>
                            </div>
                        </header>




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

                        {activeTab === 'shop' ? (
                            loading ? (
                                <div className="text-center py-20 text-gray-500">
                                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    아이템을 불러오는 중...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredItems.map((item) => {
                                        const isOwned = inventory.some(invItem => invItem.id === item.id);
                                        const isOneTimePurchase = ['background', 'hair', 'face', 'outfit', 'accessory', 'cookie'].includes(item.category || '');
                                        const isPurchased = isOwned && isOneTimePurchase;
                                        const requiredLevel = item.requiredLevel || 0;
                                        const isLevelInsufficient = requiredLevel > level;

                                        const requiredBadge = item.requiredBadge;
                                        const hasRequiredBadge = !requiredBadge || Object.values(badges).some(b => b.title === requiredBadge && b.hasBadge);
                                        const isSoldOut = item.useStock && (item.stock || 0) <= 0;

                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`group border rounded-xl p-4 transition-all duration-300 bg-white border-gray-100 ${isPurchased || isLevelInsufficient || isSoldOut ? 'opacity-60' : 'hover:shadow-xl hover:-translate-y-1'}`}
                                                onMouseEnter={() => {
                                                    // 장착 불가능한 아이템(others)이나 이미 구매한 템 등은 호버 이벤트 제외 (원할 경우 추가 수정)
                                                    if (!isPurchased && !isSoldOut && item.category !== 'others') {
                                                        setHoveredItem(item);
                                                    }
                                                }}
                                                onMouseLeave={() => setHoveredItem(null)}
                                            >
                                                <div className="aspect-square bg-gray-50 rounded-lg mb-4 overflow-hidden relative">
                                                    {item.imageUrl ? (
                                                        <img src={getProxyImageUrl(item.imageUrl)} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 ${isPurchased || isLevelInsufficient ? '' : 'group-hover:scale-110'}`} />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-300 text-5xl">🍪</div>
                                                    )}
                                                    {item.isDonation && (
                                                        <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-pulse">
                                                            ❤️ 기부
                                                        </div>
                                                    )}
                                                    {!isPurchased && requiredLevel > 0 && (
                                                        <div className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full shadow-md ${isLevelInsufficient ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                                                            Lv. {requiredLevel}
                                                        </div>
                                                    )}
                                                    {!isPurchased && requiredBadge && (
                                                        <div className={`absolute top-8 left-2 text-xs font-bold px-2 py-1 rounded-full shadow-md mt-1 ${!hasRequiredBadge ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'}`}>
                                                            🏅 {requiredBadge}
                                                        </div>
                                                    )}
                                                    {isPurchased && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <span className="bg-white/90 text-gray-800 font-bold px-3 py-1 rounded-full text-sm shadow-md">
                                                                구매 완료
                                                            </span>
                                                        </div>
                                                    )}
                                                    {isSoldOut && !isPurchased && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <span className="bg-white/90 text-red-600 font-bold px-3 py-1 rounded-full text-sm shadow-md">
                                                                품절
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="font-bold text-lg text-gray-800 mb-1">
                                                    {item.name}
                                                    {item.useStock && !isSoldOut && (
                                                        <span className="ml-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold align-middle">
                                                            잔여 {item.stock}개
                                                        </span>
                                                    )}
                                                </h3>

                                                <div className="flex justify-between items-end mt-4">
                                                    <div className="text-orange-600 font-black text-xl">
                                                        🍪 {item.price}
                                                    </div>
                                                    <button
                                                        onClick={() => initiatePurchase(item)}
                                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm ${isPurchased || isSoldOut
                                                            ? 'bg-gray-300 text-white cursor-not-allowed'
                                                            : isLevelInsufficient || !hasRequiredBadge // Check badge
                                                                ? 'bg-red-100 text-red-400 cursor-not-allowed'
                                                                : realCookies >= item.price
                                                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                            }`}
                                                        disabled={realCookies < item.price || isPurchased || isLevelInsufficient || !hasRequiredBadge || isSoldOut}
                                                    >
                                                        {isPurchased
                                                            ? '구매 완료'
                                                            : isSoldOut
                                                                ? '품절'
                                                                : isLevelInsufficient
                                                                    ? `Lv.${requiredLevel} 필요`
                                                                    : !hasRequiredBadge
                                                                        ? `뱃지 필요`
                                                                        : '구매하기'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            // Inventory Tab
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredInventory.length === 0 ? (
                                    <div className="col-span-full text-center py-20 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <div className="text-4xl mb-4">🎒</div>
                                        <p className="text-lg font-medium">보관함이 비어있습니다.</p>
                                        <p className="text-sm mt-2">상점에서 멋진 아이템을 구매해보세요!</p>
                                    </div>
                                ) : (
                                    filteredInventory.map((item) => (
                                        <div key={item.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                                            <div className="aspect-square bg-gray-50 rounded-lg mb-4 overflow-hidden relative">
                                                {item.imageUrl ? (
                                                    <img src={getProxyImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-300 text-5xl">🍪</div>
                                                )}
                                                {item.quantity && item.quantity > 1 && (
                                                    <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                                        x{item.quantity}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-lg text-gray-800 mb-1">{item.name}</h3>
                                            <div className="mt-4">
                                                {item.category && item.category !== 'others' ? (
                                                    <button
                                                        onClick={() => handleEquip(item)}
                                                        className={`w-full py-2 rounded-lg font-bold text-sm transition-colors ${equippedItems[item.category]?.id === item.id
                                                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                                            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                                            }`}
                                                    >
                                                        {equippedItems[item.category]?.id === item.id ? '장착 해제' : '장착하기'}
                                                    </button>
                                                ) : (
                                                    <button className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg font-bold text-sm cursor-not-allowed">
                                                        {item.category === 'others' ? '장착 불가 (기타)' : '장착 불가'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
