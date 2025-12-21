'use client';

import { useState, useEffect } from 'react';
import { firebaseService, ShopItem } from '@/lib/firebase/core';
import AvatarDisplay from './AvatarDisplay';

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

    const [classCode, setClassCode] = useState<string | null>(null);
    const [className, setClassName] = useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<'all' | 'hair' | 'face' | 'outfit' | 'accessory' | 'others'>('all');

    const categories = [
        { id: 'all', label: '전체' },
        { id: 'hair', label: '헤어' },
        { id: 'face', label: '얼굴' },
        { id: 'outfit', label: '의상' },
        { id: 'accessory', label: '액세서리' },
        { id: 'others', label: '기타' },
    ];


    useEffect(() => {
        const storedClassCode = localStorage.getItem('classCode');
        const storedClassName = localStorage.getItem('className');
        const storedApiKey = localStorage.getItem('apiKey');

        setClassCode(storedClassCode);
        setClassName(storedClassName);
        if (storedClassCode) {
            fetchItems(storedClassCode);
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

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.name || (newItem.price !== undefined && newItem.price < 0)) return;
        if (!classCode) return;

        setLoading(true);
        try {
            let imageUrl = newItem.imageUrl || '';

            if (imageFile) {
                imageUrl = await firebaseService.uploadImage(imageFile);
            }

            await firebaseService.addItem(classCode, {
                name: newItem.name!,
                price: newItem.price || 0,
                imageUrl: imageUrl,
                isDonation: newItem.isDonation || false,
                category: newItem.category,
                requiredLevel: newItem.requiredLevel || 0,
                requiredBadge: newItem.requiredBadge || '',
                style: newItem.style,
            });

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

    const handleUpdatePrice = async (id: string) => {
        if (!classCode) return;
        try {
            await firebaseService.updateItem(classCode, id, { price: editPrice });
            setEditingId(null);
            fetchItems(classCode);
        } catch (error) {
            alert("가격 수정 실패");
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

    const filteredItems = items.filter(item => selectedCategory === 'all' || item.category === selectedCategory);


    return (
        <div className="min-h-screen bg-gray-50 p-8">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Item Form & Preview Section - Only allow adding if not global view or admin */}
                    {/* Actually, everyone can add items. Admin adds to global, Teacher adds to local. */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Left: Add Item Form */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">
                                {classCode === 'GLOBAL' ? '공통 아이템 추가' : '우리 반 아이템 추가'}
                            </h2>
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

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                                    <select
                                        value={newItem.category || 'accessory'}
                                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
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
                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
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
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <input
                                                                type="number"
                                                                value={editPrice}
                                                                onChange={(e) => setEditPrice(Number(e.target.value))}
                                                                className="w-20 px-2 py-1 border rounded text-sm"
                                                            />
                                                            <button
                                                                onClick={() => item.id && handleUpdatePrice(item.id)}
                                                                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                                            >
                                                                저장
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="px-2 py-1 bg-gray-400 text-white rounded text-xs"
                                                            >
                                                                취소
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center mt-2">
                                                            <span className="text-orange-600 font-bold">🍪 {item.price}</span>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingId(item.id || null);
                                                                    setEditPrice(item.price);
                                                                }}
                                                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                                            >
                                                                가격 수정
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
            </div>
        </div>
    );
}
