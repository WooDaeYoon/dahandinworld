'use client';

import React, { useState, useEffect } from 'react';
import { firebaseService, ShopItem, SquareParticipant, Thermometer, TeacherMessage, ItemSuggestion, BankSettings } from '@/lib/firebase/core';
import { dahandinClient } from '@/lib/dahandin/client';
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
        style: { x: 0, y: 0, width: 100 },
        useStock: false,
        stock: 0
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<number>(0);
    const [editLevel, setEditLevel] = useState<number>(0);
    const [editStock, setEditStock] = useState<number>(0);
    const [editName, setEditName] = useState<string>('');

    const [classCode, setClassCode] = useState<string | null>(null);
    const [className, setClassName] = useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<'all' | 'background' | 'hair' | 'face' | 'outfit' | 'accessory' | 'cookie' | 'others' | 'consumable'>('all');
    const [activeTab, setActiveTab] = useState<'shop' | 'students' | 'coupons' | 'square' | 'thermometers' | 'messages' | 'suggestions'>('shop');
    const [selectedThermometerForDetails, setSelectedThermometerForDetails] = useState<Thermometer | null>(null);
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
    const [studentRealCookies, setStudentRealCookies] = useState<number | null>(null);
    const [rewardAmount, setRewardAmount] = useState<number>(0);
    const [rewardReason, setRewardReason] = useState<string>('');
    const [selectedGiftItemId, setSelectedGiftItemId] = useState<string>('');
    const [isGiftingItem, setIsGiftingItem] = useState(false);
    const [isProvidingCookie, setIsProvidingCookie] = useState(false);

    // Square Management State
    const [squareParticipants, setSquareParticipants] = useState<SquareParticipant[]>([]);
    const [squareConfig, setSquareConfig] = useState<{ background?: string; isRestricted?: boolean; allowedTimeSlots?: { start: string, end: string }[] }>({ background: 'bg.png' });

    const [thermometers, setThermometers] = useState<Thermometer[]>([]);
    const [newThermometer, setNewThermometer] = useState<Partial<Thermometer>>({
        name: '',
        targetDegree: 100,
        cookiesPerDegree: 10
    });
    const [loadingThermometers, setLoadingThermometers] = useState(false);

    // Teacher Messages State
    const [teacherMessages, setTeacherMessages] = useState<TeacherMessage[]>([]);

    // Item Suggestions State
    const [itemSuggestions, setItemSuggestions] = useState<ItemSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [approvingSuggestion, setApprovingSuggestion] = useState<ItemSuggestion | null>(null);
    const [approveConfig, setApproveConfig] = useState({
        price: 0,
        requiredLevel: 1,
        useStock: false,
        stock: 10,
        isDonation: false,
        requiredBadge: ''
    });

    const [bankSettings, setBankSettings] = useState<BankSettings>({ rate7d: 5, rate14d: 10, rate28d: 20 });
    const [savingBankSettings, setSavingBankSettings] = useState(false);

    const categories = [
        { id: 'all', label: '전체' },
        { id: 'background', label: '배경' },
        { id: 'cookie', label: '쿠키맛' },
        { id: 'face', label: '얼굴' },
        { id: 'hair', label: '헤어' },
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

    const fetchThermometers = async (code: string) => {
        setLoadingThermometers(true);
        try {
            const data = await firebaseService.getThermometers(code);
            setThermometers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingThermometers(false);
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
                fetchStudents(storedClassCode);
                fetchCoupons(storedClassCode);
                fetchThermometers(storedClassCode);
                fetchBankSettings(storedClassCode);
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

    const fetchBankSettings = async (code: string) => {
        try {
            const settings = await firebaseService.getBankSettings(code);
            setBankSettings(settings);
        } catch (error) {
            console.error("Failed to fetch bank settings:", error);
        }
    };

    const handleSaveBankSettings = async () => {
        if (!classCode || classCode === 'GLOBAL') return;
        setSavingBankSettings(true);
        try {
            await firebaseService.updateBankSettings(classCode, bankSettings);
            alert("은행 설정이 저장되었습니다.");
        } catch (error) {
            console.error(error);
            alert("은행 설정 저장 중 오류가 발생했습니다.");
        } finally {
            setSavingBankSettings(false);
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

    useEffect(() => {
        if (!classCode || classCode === 'GLOBAL') return;
        const unsubMessages = firebaseService.subscribeToTeacherMessages(classCode, (msgs) => {
            setTeacherMessages(msgs);
        });
        return () => unsubMessages();
    }, [classCode]);

    const fetchItemSuggestions = async () => {
        if (!classCode || classCode === 'GLOBAL') return;
        setLoadingSuggestions(true);
        try {
            const suggestions = await firebaseService.getItemSuggestions(classCode);
            setItemSuggestions(suggestions);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'suggestions') {
            fetchItemSuggestions();
        }
    }, [activeTab]);

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
                isConsumable: itemType === 'consumable',
                useStock: newItem.useStock || false,
                stock: newItem.stock || 0
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
                style: { x: 0, y: 0, width: 100 },
                useStock: false,
                stock: 0
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

    const handleUpdateItemParams = async (item: ShopItem) => {
        if (!classCode || !item.id) return;
        try {
            const updatePayload: Partial<ShopItem> = {
                name: editName,
                price: editPrice,
                requiredLevel: editLevel
            };
            if (item.useStock) {
                updatePayload.stock = editStock;
                if (editStock > 0) updatePayload.isHidden = false;
            }
            await firebaseService.updateItem(classCode, item.id, updatePayload);
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
        const cache = localStorage.getItem('studentLoginCache');
        localStorage.clear();
        if (cache) localStorage.setItem('studentLoginCache', cache);
        window.location.href = '/login';
    };

    const handleStudentClick = async (student: any) => {
        setSelectedStudent(student);
        setStudentRealCookies(null);
        if (classCode) {
            const logs = await firebaseService.getCookieLog(classCode, student.id);
            setStudentCookieLogs(logs);

            try {
                const storedApiKey = localStorage.getItem('apiKey');
                if (storedApiKey && student.studentCode) {
                    const response = await dahandinClient.getStudentTotal(student.studentCode, storedApiKey);
                    if (response.result && response.data) {
                        const baseCookies = response.data.totalCookie || 0;
                        const usedCookies = await firebaseService.getUsedCookies(classCode, student.id);
                        setStudentRealCookies(baseCookies - usedCookies);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch student real cookies", err);
            }
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

    const handleGiftItem = async () => {
        if (!selectedGiftItemId || !selectedStudent || !classCode) return;
        const targetItem = items.find(i => i.id === selectedGiftItemId);
        if (!targetItem) return;
        setIsGiftingItem(true);
        try {
            await firebaseService.grantItemToStudent(classCode, selectedStudent.id, targetItem);
            alert(`${selectedStudent.name} 학생에게 ${targetItem.name} 아이템을 선물했습니다!`);
            setSelectedGiftItemId('');
        } catch (error) {
            console.error(error);
            alert("아이템 선물 중 오류가 발생했습니다.");
        } finally {
            setIsGiftingItem(false);
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

    const handleAddThermometer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classCode || !newThermometer.name || !newThermometer.targetDegree || !newThermometer.cookiesPerDegree) return;
        try {
            await firebaseService.addThermometer(classCode, newThermometer as Thermometer);
            setNewThermometer({ name: '', targetDegree: 100, cookiesPerDegree: 10 });
            alert("온도계가 추가되었습니다.");
            fetchThermometers(classCode);
        } catch (error) {
            alert("온도계 추가 실패");
        }
    };

    const handleDeleteThermometer = async (id: string) => {
        if (!classCode || !id) return;
        if (!confirm("정말 이 온도계를 삭제하시겠습니까?")) return;
        try {
            await firebaseService.deleteThermometer(classCode, id);
            fetchThermometers(classCode);
        } catch (error) {
            alert("삭제 실패");
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

    const handleApproveSuggestion = (suggestion: ItemSuggestion) => {
        setApprovingSuggestion(suggestion);
        setApproveConfig({
            price: 100, // Default price
            requiredLevel: 1,
            useStock: false,
            stock: 10,
            isDonation: false,
            requiredBadge: ''
        });
    };

    const handleConfirmApprove = async () => {
        if (!classCode || !approvingSuggestion) return;
        
        try {
            const newItem = {
                ...approvingSuggestion.item,
                price: approveConfig.price,
                requiredLevel: approveConfig.requiredLevel,
                useStock: approveConfig.useStock,
                stock: approveConfig.stock,
                isDonation: approveConfig.isDonation,
                requiredBadge: approveConfig.requiredBadge
            };
            
            await firebaseService.approveItemSuggestion(classCode, approvingSuggestion.id!, newItem);
            alert("아이템이 승인되어 상점에 추가되었습니다.");
            setApprovingSuggestion(null);
            fetchItemSuggestions();
            fetchItems(classCode);
        } catch (error) {
            console.error(error);
            alert("승인 중 오류가 발생했습니다.");
        }
    };

    const handleRejectSuggestion = async (suggestionId: string) => {
        if (!classCode) return;
        if (!confirm("이 제안을 거절(삭제)하시겠습니까?")) return;

        try {
            await firebaseService.deleteItemSuggestion(classCode, suggestionId);
            fetchItemSuggestions();
        } catch (error) {
            console.error(error);
            alert("거절 중 오류가 발생했습니다.");
        }
    };

    const handleDownloadImage = async (url: string, name: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${name}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Failed to download image", error);
            alert("이미지 다운로드에 실패했습니다.");
        }
    };

    const filteredItems = items
        .filter(item => {
            if (selectedCategory === 'all') return true;
            if (selectedCategory === 'consumable') return item.isConsumable === true;
            return item.category === selectedCategory && !item.isConsumable;
        })
        .sort((a, b) => {
            const aIsGlobal = a.isGlobal ? 1 : 0;
            const bIsGlobal = b.isGlobal ? 1 : 0;
            return bIsGlobal - aIsGlobal;
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
                            <p className="text-sm font-bold text-indigo-400 tracking-wider font-mono mt-1 mb-2">{selectedStudent.studentCode}</p>
                            
                            {studentRealCookies !== null && (
                                <div className="inline-block mt-1">
                                    <span className="bg-orange-100/80 text-orange-600 px-3 py-1.5 rounded-full text-sm font-bold border border-orange-200 shadow-sm flex items-center gap-1.5">
                                        <span className="text-base">🍪</span>
                                        잔여 쿠키: {studentRealCookies}개
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 bg-gray-50 flex-1 overflow-y-auto custom-scrollbar">
                            {/* Equipped Items Info */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>👕</span> 착용 중인 아이템
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {['background', 'hair', 'face', 'outfit', 'accessory', 'accessory_0', 'accessory_1', 'accessory_2', 'cookie'].map(category => {
                                        const item = selectedStudent.equippedItems?.[category];
                                        if (category.startsWith('accessory_') && !item) return null;
                                        if (category === 'accessory' && !item && ['accessory_0', 'accessory_1', 'accessory_2'].some(k => selectedStudent.equippedItems?.[k])) return null;
                                        return (
                                            <div key={category} className="border border-gray-100 rounded-lg p-2 flex flex-col items-center bg-gray-50 shadow-sm text-center transition-colors hover:border-indigo-200">
                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden mb-2 border border-gray-100 shrink-0">
                                                    {item?.imageUrl ? (
                                                        <img src={getProxyImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">없음</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400 mb-0.5">{
                                                    category === 'background' ? '배경' :
                                                    category === 'hair' ? '헤어' :
                                                    category === 'face' ? '얼굴' :
                                                    category === 'outfit' ? '의상' :
                                                    category.startsWith('accessory') ? '액세서리' : '쿠키맛'
                                                }</div>
                                                <div className="text-xs font-bold text-gray-800 break-all line-clamp-2 w-full leading-tight" title={item?.name || '미착용'}>
                                                    {item?.name || '미착용'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span>🎁</span> 선생님 아이템 선물하기
                                </h4>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedGiftItemId}
                                        onChange={(e) => setSelectedGiftItemId(e.target.value)}
                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    >
                                        <option value="">아이템 선택</option>
                                        {items.filter(i => !i.isHidden).map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({item.isGlobal ? '공용' : '우리반'})
                                            </option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={handleGiftItem}
                                        disabled={isGiftingItem || !selectedGiftItemId}
                                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:bg-gray-300 disabled:shadow-none whitespace-nowrap"
                                    >
                                        선물
                                    </button>
                                </div>
                            </div>
                            
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
                            onClick={() => window.open('https://woodaeyoon.github.io/pixelmaker/', '_blank')}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition-colors flex items-center gap-2"
                        >
                            <span>🎨</span> 아이템 만들기
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </header>

                {classCode && classCode !== 'GLOBAL' && (
                    <div className="flex flex-col gap-4 mb-8">
                        <div className="flex gap-4 border-b pb-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
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
                                onClick={() => setActiveTab('square')}
                                className={`text-xl md:text-2xl font-bold transition-colors relative ${['square', 'coupons', 'thermometers', 'suggestions', 'bank'].includes(activeTab) ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                ⚙️ 기능 관리
                                {teacherMessages.filter(m => !m.isRead).length > 0 && (
                                    <span className="absolute -top-1 -right-4 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                        {teacherMessages.filter(m => !m.isRead).length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {['square', 'coupons', 'thermometers', 'suggestions', 'bank'].includes(activeTab) && (
                            <div className="flex gap-3 flex-wrap animate-fade-in">
                                <button
                                    onClick={() => setActiveTab('square')}
                                    className={`px-4 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'square' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    🌳 광장 관리
                                    {teacherMessages.filter(m => !m.isRead).length > 0 && (
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'square' ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'}`}>
                                            {teacherMessages.filter(m => !m.isRead).length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => { 
                                        setActiveTab('coupons'); 
                                        setSelectedCouponId(null); 
                                        setIsIssuingCoupon(false);
                                        setUseSelectedStudents([]);
                                        classCode && fetchCoupons(classCode); 
                                    }}
                                    className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${activeTab === 'coupons' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    🎟️ 쿠폰 관리
                                </button>
                                <button
                                    onClick={() => setActiveTab('thermometers')}
                                    className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${activeTab === 'thermometers' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    🌡️ 학급온도 관리
                                </button>
                                <button
                                    onClick={() => setActiveTab('suggestions')}
                                    className={`px-4 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'suggestions' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    🎁 제안된 아이템
                                    {itemSuggestions.length > 0 && (
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'suggestions' ? 'bg-white text-indigo-600' : 'bg-yellow-500 text-white'}`}>
                                            {itemSuggestions.length}
                                        </span>
                                    )}
                                </button>
                                {classCode !== 'GLOBAL' && (
                                    <button
                                        onClick={() => setActiveTab('bank')}
                                        className={`px-4 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'bank' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        🏦 은행 관리
                                    </button>
                                )}
                            </div>
                        )}
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={newItem.useStock || false}
                                                    onChange={(e) => setNewItem({ ...newItem, useStock: e.target.checked })}
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                />
                                                재고 한정 판매
                                            </label>
                                            {newItem.useStock && (
                                                <input
                                                    type="number"
                                                    value={newItem.stock || 0}
                                                    onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mt-1"
                                                    placeholder="재고 수량"
                                                    min="1"
                                                />
                                            )}
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
                                                    <option value="cookie">쿠키맛 (Cookie Flavor)</option>
                                                    <option value="face">얼굴 (Face)</option>
                                                    <option value="hair">헤어 (Hair)</option>
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
                                                    const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.') || file.name;
                                                    setNewItem(prev => ({ 
                                                        ...prev, 
                                                        imageUrl: objectUrl,
                                                        name: prev.name || fileNameWithoutExt 
                                                    }));
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
                                                            <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1 bg-purple-100 text-purple-700 mr-1">
                                                                🏅 {item.requiredBadge}
                                                            </span>
                                                        )}
                                                        {item.useStock && (
                                                            <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1 bg-rose-100 text-rose-700 font-bold">
                                                                📦 잔여 {item.stock}개
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
                                                            // Local item or Admin view: Show Delete and Download
                                                            <>
                                                                <button
                                                                    onClick={() => item.imageUrl && handleDownloadImage(getProxyImageUrl(item.imageUrl), item.name)}
                                                                    className="text-blue-500 hover:text-blue-700 text-xs font-bold bg-blue-50 px-2 py-1 rounded mb-1 whitespace-nowrap shrink-0"
                                                                >
                                                                    ⬇️ 저장
                                                                </button>
                                                                <button
                                                                    onClick={() => item.id && handleDeleteItem(item.id)}
                                                                    className="text-red-400 hover:text-red-600 text-sm"
                                                                >
                                                                    삭제
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price Edit - Only for Local items or Admin */}
                                                {(!isGlobalItem || classCode === 'GLOBAL') && (
                                                    <>
                                                        {editingId === item.id ? (
                                                            <div className="flex flex-col gap-2 mt-2 bg-gray-50 border rounded p-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500 w-8 shrink-0">이름:</span>
                                                                    <input
                                                                        type="text"
                                                                        value={editName}
                                                                        onChange={(e) => setEditName(e.target.value)}
                                                                        className="w-full px-2 py-1 border rounded text-sm"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500 w-8 shrink-0">가격:</span>
                                                                    <input
                                                                        type="number"
                                                                        value={editPrice}
                                                                        onChange={(e) => setEditPrice(Number(e.target.value))}
                                                                        className="w-16 px-2 py-1 border rounded text-sm"
                                                                        min="0"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500 w-8 shrink-0">레벨:</span>
                                                                    <input
                                                                        type="number"
                                                                        value={editLevel}
                                                                        onChange={(e) => setEditLevel(Number(e.target.value))}
                                                                        className="w-16 px-2 py-1 border rounded text-sm"
                                                                        min="0"
                                                                    />
                                                                </div>
                                                                {item.useStock && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-gray-500 w-8 shrink-0">재고:</span>
                                                                        <input
                                                                            type="number"
                                                                            value={editStock}
                                                                            onChange={(e) => setEditStock(Number(e.target.value))}
                                                                            className="w-16 px-2 py-1 border rounded text-sm"
                                                                            min="0"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-2 justify-end mt-1">
                                                                    <button
                                                                        onClick={() => handleUpdateItemParams(item)}
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
                                                                        setEditName(item.name || '');
                                                                        setEditPrice(item.price);
                                                                        setEditLevel(item.requiredLevel || 0);
                                                                        setEditStock(item.stock || 0);
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
                                            {items.filter(item => item.isConsumable).map(coupon => (
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
                                            {items.filter(item => item.isConsumable).length === 0 && (
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
                                {items.filter(item => item.isConsumable).length === 0 ? (
                                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        <p>등록된 쿠폰이 없어요.</p>
                                    </div>
                                ) : (
                                    items.filter(item => item.isConsumable).map(coupon => (
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

                            {/* 광장 출입 제한 설정 */}
                            <div className="bg-yellow-50/50 p-5 rounded-lg border border-yellow-100 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800">광장 출입 제한 설정 ⏰</h3>
                                    <label className="relative inline-flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={squareConfig.isRestricted || false}
                                            onChange={(e) => {
                                                // 토글 변경 시 즉시 DB 저장
                                                const newConfig = { ...squareConfig, isRestricted: e.target.checked };
                                                setSquareConfig(newConfig);
                                                if (classCode) firebaseService.updateSquareConfig(classCode, newConfig);
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                        <span className="ml-3 text-sm font-bold text-gray-700">제한 기능 켜기</span>
                                    </label>
                                </div>
                                
                                {squareConfig.isRestricted && (
                                    <div className="bg-white p-4 rounded border border-yellow-50 flex flex-col gap-3 shadow-sm">
                                        <p className="text-sm text-gray-600 mb-2">아래 설정된 시간에만 학생들이 다했니 광장에 접속할 수 있습니다.</p>
                                        
                                        {(squareConfig.allowedTimeSlots || []).map((slot, index) => (
                                            <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded border border-gray-100">
                                                <input 
                                                    type="time" 
                                                    value={slot.start} 
                                                    onChange={(e) => {
                                                        const newSlots = [...(squareConfig.allowedTimeSlots || [])];
                                                        newSlots[index].start = e.target.value;
                                                        setSquareConfig({ ...squareConfig, allowedTimeSlots: newSlots });
                                                    }}
                                                    className="px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium flex-1 text-center"
                                                />
                                                <span className="font-bold text-gray-400">~</span>
                                                <input 
                                                    type="time" 
                                                    value={slot.end} 
                                                    onChange={(e) => {
                                                        const newSlots = [...(squareConfig.allowedTimeSlots || [])];
                                                        newSlots[index].end = e.target.value;
                                                        setSquareConfig({ ...squareConfig, allowedTimeSlots: newSlots });
                                                    }}
                                                    className="px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium flex-1 text-center"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const newSlots = [...(squareConfig.allowedTimeSlots || [])];
                                                        newSlots.splice(index, 1);
                                                        setSquareConfig({ ...squareConfig, allowedTimeSlots: newSlots });
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 text-xl font-bold ml-2 transition-colors px-2"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {(!squareConfig.allowedTimeSlots || squareConfig.allowedTimeSlots.length === 0) && (
                                            <div className="text-center py-4 text-xs text-red-500 font-bold bg-red-50 rounded border border-red-100 break-keep">
                                                개방 시간이 없습니다. 현재 모든 학생의 접속이 차단됩니다.
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                            <button 
                                                onClick={() => {
                                                    const newSlots = [...(squareConfig.allowedTimeSlots || []), { start: '09:00', end: '18:00' }];
                                                    setSquareConfig({ ...squareConfig, allowedTimeSlots: newSlots });
                                                }}
                                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-bold transition-colors"
                                            >
                                                + 시간 추가
                                            </button>
                                            
                                            <button 
                                                onClick={() => {
                                                    if (classCode) firebaseService.updateSquareConfig(classCode, squareConfig);
                                                    alert('광장 개방 시간이 저장되었습니다.');
                                                }}
                                                className="px-4 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-bold transition-colors shadow-sm"
                                            >
                                                시간 저장하기
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- 선생님 편지함 (광장 관리 탭 안에 포함됨) --- */}
                        <div className="mt-8 border-t pt-8">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-800">📩 학생 편지함</h2>
                                <p className="text-sm text-gray-500 mt-1">광장에서 학생들이 보낸 편지나 질문을 확인합니다.</p>
                            </div>
                            
                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {teacherMessages.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                        아직 도착한 편지가 없습니다.
                                    </div>
                                ) : (
                                    teacherMessages.map(msg => (
                                        <div key={msg.id} className={`p-4 rounded-xl border transition-all ${msg.isRead ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-yellow-50 border-yellow-200 shadow-sm'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center text-sm">
                                                        ✉️
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{msg.studentName} <span className="text-xs font-normal text-gray-500 ml-1">({msg.studentCode})</span></div>
                                                        <div className="text-[10px] text-gray-400">
                                                            {msg.timestamp ? msg.timestamp.toDate().toLocaleString('ko-KR') : '방금 전'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!msg.isRead && (
                                                        <button 
                                                            onClick={() => classCode && msg.id && firebaseService.markTeacherMessageRead(classCode, msg.id)}
                                                            className="px-3 py-1 bg-white border border-gray-300 text-gray-600 rounded-md text-xs font-bold hover:bg-gray-50 transition-colors"
                                                        >
                                                            읽음 처리
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm("편지를 삭제하시겠습니까?")) {
                                                                classCode && msg.id && firebaseService.deleteTeacherMessage(classCode, msg.id);
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-md text-xs font-bold transition-colors"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="ml-10 text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-yellow-100/50">
                                                {msg.message}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        {/* --- 편지함 끝 --- */}

                    </div>
                ) : activeTab === 'thermometers' ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <div className="mb-6 border-b pb-4">
                            <h2 className="text-xl font-bold text-gray-800">🌡️ 학급온도 관리</h2>
                            <p className="text-sm text-gray-500 mt-1">우리 반에 여러 개의 온도계를 설정하고 기부 방향을 다양하게 열어주세요.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-orange-50/50 p-5 rounded-lg border border-orange-100 h-fit">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">새 온도계 추가하기 🌟</h3>
                                <form onSubmit={handleAddThermometer} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">온도계 이름</label>
                                        <input
                                            type="text"
                                            value={newThermometer.name}
                                            onChange={e => setNewThermometer({...newThermometer, name: e.target.value})}
                                            placeholder="예: 불우이웃 돕기"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">목표 온도</label>
                                            <input
                                                type="number"
                                                value={newThermometer.targetDegree}
                                                onChange={e => setNewThermometer({...newThermometer, targetDegree: Number(e.target.value)})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">1도당 필요 쿠키</label>
                                            <input
                                                type="number"
                                                value={newThermometer.cookiesPerDegree}
                                                onChange={e => setNewThermometer({...newThermometer, cookiesPerDegree: Number(e.target.value)})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="w-full py-2 bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold rounded-lg shadow-sm hover:from-orange-500 hover:to-red-600 transition-colors"
                                    >
                                        온도계 생성
                                    </button>
                                </form>
                            </div>

                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center">
                                    등록된 온도계 목록
                                    <button onClick={() => classCode && fetchThermometers(classCode)} className="text-sm px-2 py-1 bg-white border rounded text-gray-600 hover:bg-gray-100">새로고침</button>
                                </h3>
                                
                                {loadingThermometers ? (
                                    <div className="text-center py-8 text-gray-400">데이터를 불러오는 중입니다...</div>
                                ) : thermometers.length === 0 ? (
                                    <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm">
                                        등록된 온도계가 없습니다.<br/>(미등록 시 기존 '쿠키월드 사랑의 온도'가 표시됩니다)
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {thermometers.map(t => (
                                            <div 
                                                key={t.id} 
                                                className="bg-white p-4 rounded-lg flex flex-col gap-2 border border-orange-100 shadow-sm relative group overflow-hidden cursor-pointer hover:border-orange-300 transition-colors"
                                                onClick={() => setSelectedThermometerForDetails(t)}
                                            >
                                                <div className="absolute right-3 top-3 z-10">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteThermometer(t.id!);
                                                        }} 
                                                        className="text-gray-300 hover:text-red-500 transition-colors font-bold text-xl px-1"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                                <div className="font-bold text-lg text-gray-800 pr-8">{t.name}</div>
                                                <div className="text-xs text-gray-500 flex gap-2">
                                                    <span>목표 <b className="text-gray-700">{t.targetDegree}도</b></span> | 
                                                    <span>게이지 <b className="text-gray-700">{t.cookiesPerDegree}쿠키/1도</b></span>
                                                </div>
                                                <div className="bg-gray-100 h-4 rounded-full mt-1 overflow-hidden relative">
                                                    <div 
                                                        className="bg-gradient-to-r from-orange-400 to-red-500 h-full transition-all"
                                                        style={{ width: `${Math.min((t.currentDegree / t.targetDegree) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-right text-xs font-bold text-orange-600 mt-1">
                                                    {t.currentDegree.toFixed(1)}도 / {t.targetDegree}도
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'suggestions' ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">🎁 학생들이 제안한 아이템</h2>
                            <button onClick={fetchItemSuggestions} className="text-sm px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-700 font-bold">
                                🔄 새로고침
                            </button>
                        </div>

                        {loadingSuggestions ? (
                            <div className="text-center py-10 text-gray-500">불러오는 중...</div>
                        ) : itemSuggestions.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <span className="text-4xl mb-4 block">💡</span>
                                <p className="text-lg font-bold text-gray-600">제안된 아이템이 없습니다.</p>
                                <p className="text-sm text-gray-400 mt-2">학생들이 아이템을 제안하면 여기에 표시됩니다.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {itemSuggestions.map(suggestion => (
                                    <div key={suggestion.id} className="border border-yellow-200 rounded-xl p-4 bg-yellow-50 hover:shadow-md transition-shadow relative">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800">{suggestion.item.name}</h3>
                                                <p className="text-xs text-gray-500">제안자: <span className="font-bold">{suggestion.studentName}</span></p>
                                            </div>
                                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-bold">
                                                {suggestion.item.category}
                                            </span>
                                        </div>

                                        <div className="aspect-square bg-white rounded-lg mb-3 overflow-hidden border border-gray-100 flex items-center justify-center p-2 relative">
                                            {suggestion.item.imageUrl && (
                                                <img src={getProxyImageUrl(suggestion.item.imageUrl)} alt={suggestion.item.name} className="max-w-full max-h-full object-contain" />
                                            )}
                                        </div>

                                        <div className="bg-white p-3 rounded-lg border border-yellow-100 mb-4 h-24 overflow-y-auto custom-scrollbar">
                                            <h4 className="text-xs font-bold text-gray-600 mb-1">📝 제안 이유</h4>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{suggestion.reason || '이유 없음'}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleRejectSuggestion(suggestion.id!)}
                                                className="flex-1 py-2 bg-white text-red-500 border border-red-200 rounded-lg font-bold hover:bg-red-50 transition-colors"
                                            >
                                                거절
                                            </button>
                                            <button 
                                                onClick={() => handleApproveSuggestion(suggestion)}
                                                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                                            >
                                                승인 (상점 추가)
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Approval Configuration Modal */}
                        {approvingSuggestion && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span>✨</span> 아이템 승인 설정
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">가격 (쿠키)</label>
                                            <input
                                                type="number"
                                                value={approveConfig.price}
                                                onChange={e => setApproveConfig({...approveConfig, price: Number(e.target.value)})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">구매 가능 레벨</label>
                                            <input
                                                type="number"
                                                value={approveConfig.requiredLevel}
                                                onChange={e => setApproveConfig({...approveConfig, requiredLevel: Number(e.target.value)})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">필요 뱃지 이름 (선택)</label>
                                            <input
                                                type="text"
                                                value={approveConfig.requiredBadge}
                                                onChange={e => setApproveConfig({...approveConfig, requiredBadge: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                                                placeholder="예: 칭찬뱃지"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <input
                                                type="checkbox"
                                                id="approve-useStock"
                                                checked={approveConfig.useStock}
                                                onChange={e => setApproveConfig({...approveConfig, useStock: e.target.checked})}
                                                className="w-4 h-4 text-indigo-600 rounded"
                                            />
                                            <label htmlFor="approve-useStock" className="text-sm font-bold text-gray-700">재고 제한 사용</label>
                                        </div>
                                        {approveConfig.useStock && (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">초기 재고 수량</label>
                                                <input
                                                    type="number"
                                                    value={approveConfig.stock}
                                                    onChange={e => setApproveConfig({...approveConfig, stock: Number(e.target.value)})}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-6">
                                        <button
                                            onClick={() => setApprovingSuggestion(null)}
                                            className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleConfirmApprove}
                                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                                        >
                                            승인 완료
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'bank' ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                                <span>🏦</span> 예금 이율 설정
                            </h2>
                            <button
                                onClick={handleSaveBankSettings}
                                disabled={savingBankSettings}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                            >
                                {savingBankSettings ? '저장 중...' : '설정 저장하기'}
                            </button>
                        </div>
                        <p className="text-gray-600 mb-8 border-b pb-4">
                            다했니 은행에서 제공하는 정기예금 상품의 이자율(%)을 설정합니다. 학생들은 10쿠키 단위로 예금에 가입할 수 있습니다.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 7-day Deposit */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center shadow-sm">
                                <div className="text-4xl mb-4">📅</div>
                                <h3 className="font-bold text-lg text-gray-800 mb-2">7일 만기 예금</h3>
                                <p className="text-sm text-gray-500 mb-4">비교적 짧은 기간 돈을 묶어두는 상품입니다.</p>
                                <div className="flex items-center justify-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={bankSettings.rate7d}
                                        onChange={(e) => setBankSettings({ ...bankSettings, rate7d: Number(e.target.value) })}
                                        className="w-24 text-center px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xl"
                                    />
                                    <span className="text-gray-700 font-bold text-xl">%</span>
                                </div>
                            </div>

                            {/* 14-day Deposit */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center shadow-sm">
                                <div className="text-4xl mb-4">⏳</div>
                                <h3 className="font-bold text-lg text-gray-800 mb-2">14일 만기 예금</h3>
                                <p className="text-sm text-gray-500 mb-4">중간 기간 돈을 묶어두는 상품입니다.</p>
                                <div className="flex items-center justify-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={bankSettings.rate14d}
                                        onChange={(e) => setBankSettings({ ...bankSettings, rate14d: Number(e.target.value) })}
                                        className="w-24 text-center px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xl"
                                    />
                                    <span className="text-gray-700 font-bold text-xl">%</span>
                                </div>
                            </div>

                            {/* 28-day Deposit */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center shadow-sm">
                                <div className="text-4xl mb-4">🕰️</div>
                                <h3 className="font-bold text-lg text-gray-800 mb-2">28일 만기 예금</h3>
                                <p className="text-sm text-gray-500 mb-4">한 달 가량 돈을 묶어두는 장기 상품입니다.</p>
                                <div className="flex items-center justify-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={bankSettings.rate28d}
                                        onChange={(e) => setBankSettings({ ...bankSettings, rate28d: Number(e.target.value) })}
                                        className="w-24 text-center px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xl"
                                    />
                                    <span className="text-gray-700 font-bold text-xl">%</span>
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

            {/* Left Side Floating Buttons */}
            <div className="fixed left-4 bottom-28 flex flex-col gap-3 z-50">
                <a
                    href="https://works.do/xH2hEjZ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex text-center items-center justify-center px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group gap-2"
                >
                    <span className="text-xl group-hover:scale-110 transition-transform font-normal">📁</span>
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold text-emerald-100 leading-tight">학생들을 위한</span>
                        <span className="font-bold text-sm leading-tight mt-0.5">디자인 공유 폴더</span>
                    </div>
                </a>
            </div>
            {/* Thermometer Details Modal */}
            {selectedThermometerForDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedThermometerForDetails(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedThermometerForDetails(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 z-10 p-1 bg-white rounded-full transition-colors border shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 text-center border-b border-orange-100 relative">
                            <h2 className="text-2xl font-black text-gray-800">{selectedThermometerForDetails.name}</h2>
                            <p className="text-sm text-gray-600 mt-2">학생별 기부 현황 및 기여도</p>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
                            {(() => {
                                const contributors = selectedThermometerForDetails.contributors || {};
                                const contributorEntries = Object.entries(contributors).sort((a, b) => b[1] - a[1]); // Sort by amount descending
                                
                                // Calculate total cookies from contributors to show percentage
                                const totalDonatedCookies = contributorEntries.reduce((sum, [_, amount]) => sum + amount, 0);

                                if (contributorEntries.length === 0) {
                                    return (
                                        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                                            아직 이 온도계에 기부한 학생이 없습니다.
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-2 mb-2">
                                            <span className="text-sm font-bold text-gray-600">총 기부량: {totalDonatedCookies} 쿠키</span>
                                            <span className="text-sm font-bold text-gray-600">총 {contributorEntries.length}명 참여</span>
                                        </div>
                                        {contributorEntries.map(([studentCode, amount]) => {
                                            const student = students.find(s => s.id === studentCode);
                                            const studentName = student ? student.name : studentCode;
                                            const percentage = totalDonatedCookies > 0 ? ((amount / totalDonatedCookies) * 100).toFixed(1) : "0.0";
                                            
                                            return (
                                                <div key={studentCode} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                                                    <div className="flex justify-between items-center z-10 relative">
                                                        <span className="font-bold text-gray-800">{studentName}</span>
                                                        <div className="text-right">
                                                            <span className="text-orange-600 font-bold">{amount} 쿠키</span>
                                                            <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
                                                        </div>
                                                    </div>
                                                    {/* Progress bar background */}
                                                    <div className="absolute left-0 bottom-0 top-0 bg-orange-50 z-0 transition-all" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
