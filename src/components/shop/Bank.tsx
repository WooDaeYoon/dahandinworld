'use client';

import React, { useState, useEffect } from 'react';
import { firebaseService, BankSettings, BankDeposit } from '@/lib/firebase/core';
import { dahandinClient } from '@/lib/dahandin/client';

export default function Bank() {
    const [studentCode, setStudentCode] = useState('');
    const [classCode, setClassCode] = useState('');
    const [studentName, setStudentName] = useState('');
    
    // Cookie State
    const [cookies, setCookies] = useState(0); // From Dahandin (Remaining before shop usage)
    const [usedCookies, setUsedCookies] = useState(0); // From Firebase
    const currentCookies = Math.max(0, cookies - usedCookies);

    // Bank State
    const [settings, setSettings] = useState<BankSettings>({ rate7d: 5, rate14d: 10, rate28d: 20 });
    const [deposits, setDeposits] = useState<BankDeposit[]>([]);
    
    // UI State
    const [activeTab, setActiveTab] = useState<'products' | 'my'>('products');
    const [amounts, setAmounts] = useState<{ [key: number]: number }>({ 7: 10, 14: 10, 28: 10 });
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [clerkMessage, setClerkMessage] = useState("어서오세요! 다했니월드 은행입니다.\n무엇을 도와드릴까요?");

    useEffect(() => {
        const storedCode = localStorage.getItem('studentCode');
        const storedClassCode = localStorage.getItem('classCode');
        const storedName = localStorage.getItem('studentName');
        const storedKey = localStorage.getItem('apiKey');

        if (storedCode && storedClassCode) {
            setStudentCode(storedCode);
            setClassCode(storedClassCode);
            if (storedName) setStudentName(storedName);

            fetchData(storedCode, storedClassCode, storedKey);
        } else {
            alert("로그인 정보가 없습니다.");
            window.location.href = '/login';
        }
    }, []);

    const fetchData = async (code: string, cCode: string, key: string | null) => {
        setLoading(true);
        try {
            // Get Settings
            const bankSettings = await firebaseService.getBankSettings(cCode);
            setSettings(bankSettings);

            // Get Deposits
            fetchDeposits(cCode, code);

            // Get Cookies
            if (key) {
                const response = await dahandinClient.getStudentTotal(code, key);
                if (response.result && response.data) {
                    setCookies(response.data.totalCookie); // Dahandin's Remaining cookies
                }
            }
            const used = await firebaseService.getUsedCookies(cCode, code);
            setUsedCookies(used);
            
        } catch (error) {
            console.error("Failed to fetch bank data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeposits = async (cCode: string, code: string) => {
        const userDeposits = await firebaseService.getDeposits(cCode, code);
        setDeposits(userDeposits);
        
        // Check for matured deposits to update clerk message
        const hasMatured = userDeposits.some(d => d.status === 'active' && new Date(d.endDate) <= new Date());
        if (hasMatured) {
            setClerkMessage("만기가 된 예금이 있네요! 어서 확인해보세요.");
        }
    };

    const handleAmountChange = (term: number, value: number) => {
        // Ensure increments of 10
        const roundedValue = Math.max(10, Math.floor(value / 10) * 10);
        setAmounts(prev => ({ ...prev, [term]: roundedValue }));
    };

    const handleBuyDeposit = async (term: 7 | 14 | 28) => {
        if (isProcessing) return;
        const amount = amounts[term];
        if (currentCookies < amount) {
            alert(`쿠키가 부족합니다. (보유: ${currentCookies}개)`);
            return;
        }

        const rate = term === 7 ? settings.rate7d : term === 14 ? settings.rate14d : settings.rate28d;
        const interest = Math.floor(amount * (rate / 100));
        const totalReward = amount + interest;
        
        if (!confirm(`정말 ${amount}쿠키를 ${term}일 예금에 가입하시겠습니까?\n만기 시 ${rate}%의 이자가 붙어 ${totalReward}개의 쿠키를 돌려받습니다.`)) return;

        setIsProcessing(true);
        try {
            await firebaseService.buyDeposit(classCode, studentCode, term, amount, rate);
            setClerkMessage(`감사합니다! ${term}일 예금 가입이 완료되었습니다.`);
            
            // Re-fetch data
            const used = await firebaseService.getUsedCookies(classCode, studentCode);
            setUsedCookies(used);
            fetchDeposits(classCode, studentCode);
            setAmounts(prev => ({ ...prev, [term]: 10 })); // Reset amount
            setActiveTab('my'); // Go to my deposits

        } catch (error) {
            console.error(error);
            alert("예금 가입 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClaimDeposit = async (deposit: BankDeposit) => {
        if (isProcessing) return;
        const isMatured = new Date(deposit.endDate) <= new Date();
        if (!isMatured) {
            alert("아직 만기일이 되지 않았습니다.");
            return;
        }

        if (!confirm("예금이 만기되었습니다! 원금과 이자를 수령하시겠습니까?")) return;

        setIsProcessing(true);
        try {
            await firebaseService.claimDeposit(classCode, studentCode, deposit.id!, deposit.principal, deposit.interestRate);
            
            const interest = Math.floor(deposit.principal * (deposit.interestRate / 100));
            const total = deposit.principal + interest;
            
            setClerkMessage(`축하합니다! 원금과 이자 합쳐서 총 ${total}쿠키를 돌려드렸어요.`);
            
            // Re-fetch
            const used = await firebaseService.getUsedCookies(classCode, studentCode);
            setUsedCookies(used);
            fetchDeposits(classCode, studentCode);

        } catch (error: any) {
            console.error(error);
            alert(error.message || "수령 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    return (
        <div 
            className="min-h-screen bg-cover bg-center p-4 md:p-8 font-sans relative"
            style={{ backgroundImage: "url('/assets/bank/bank_bg.png'), linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))", backgroundColor: '#2d3748' }}
        >
            <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-4rem)]">
                {/* Header */}
                <header className="flex justify-between items-center bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg mb-8">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => window.location.href = '/shop'}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 transition-colors"
                        >
                            ← 상점으로
                        </button>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                            <span>🏦</span> 다했니월드 은행
                        </h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-500">{studentName} 고객님</div>
                            <div className="text-xl font-black text-indigo-700 flex items-center gap-1">
                                🍪 {currentCookies} 쿠키
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pb-8">
                    
                    {/* Left: Clerk Character & Dialog */}
                    <div className="lg:col-span-5 flex flex-col items-center justify-end relative h-[400px] lg:h-[600px]">
                        {/* Speech Bubble */}
                        <div className="absolute top-0 w-full max-w-sm bg-white p-6 rounded-3xl shadow-xl border-4 border-indigo-100 z-10 transform -translate-y-4 animate-bounce-slight">
                            <p className="text-lg font-bold text-gray-800 text-center leading-relaxed whitespace-pre-line">
                                {clerkMessage}
                            </p>
                            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-white border-b-4 border-r-4 border-indigo-100 rotate-45"></div>
                        </div>
                        
                        {/* Clerk Image */}
                        <div className="relative w-full h-full flex items-end justify-center">
                            {/* Fallback box if image is missing */}
                            <div className="absolute inset-x-8 bottom-0 top-32 bg-indigo-900/40 rounded-t-full -z-10 blur-xl"></div>
                            <img 
                                src="/assets/bank/clerk.png" 
                                alt="은행원" 
                                className="object-contain h-[90%] drop-shadow-2xl"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            {/* Placeholder if image fails */}
                            <div className="hidden absolute bottom-0 w-64 h-96 bg-gray-200 rounded-t-full flex flex-col items-center justify-center border-4 border-gray-300">
                                <span className="text-4xl mb-4">👩‍💼</span>
                                <span className="text-gray-500 font-bold text-center px-4">clerk.png 이미지를<br/>넣어주세요</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Bank Board */}
                    <div className="lg:col-span-7 bg-[#fbf5eb] rounded-3xl shadow-2xl overflow-hidden border-[12px] border-[#8b5a2b] relative">
                        {/* Wooden texture overlay */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 8px)" }}></div>
                        
                        {/* Tabs */}
                        <div className="flex bg-[#d2a679] p-2 gap-2 border-b-4 border-[#6b4226] relative z-10">
                            <button
                                onClick={() => setActiveTab('products')}
                                className={`flex-1 py-3 px-4 font-black rounded-xl transition-all shadow-sm text-lg ${activeTab === 'products' ? 'bg-[#fbf5eb] text-[#5c3a21] translate-y-1' : 'bg-[#c1905e] text-[#5c3a21]/70 hover:bg-[#b08050] hover:text-[#5c3a21]'}`}
                            >
                                💰 예금 상품 목록
                            </button>
                            <button
                                onClick={() => setActiveTab('my')}
                                className={`flex-1 py-3 px-4 font-black rounded-xl transition-all shadow-sm text-lg flex items-center justify-center gap-2 ${activeTab === 'my' ? 'bg-[#fbf5eb] text-[#5c3a21] translate-y-1' : 'bg-[#c1905e] text-[#5c3a21]/70 hover:bg-[#b08050] hover:text-[#5c3a21]'}`}
                            >
                                📋 내 예금 확인
                                {deposits.some(d => d.status === 'active' && new Date(d.endDate) <= new Date()) && (
                                    <span className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute top-4 right-8"></span>
                                )}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 md:p-8 min-h-[400px] relative z-10">
                            {activeTab === 'products' ? (
                                <div className="space-y-6">
                                    {[
                                        { term: 7, rate: settings.rate7d, icon: '📅', title: '단기 7일 예금', desc: '짧고 굵게! 7일 뒤에 원금과 이자를 받아요.' },
                                        { term: 14, rate: settings.rate14d, icon: '⏳', title: '중기 14일 예금', desc: '2주 동안 든든하게! 더 높은 이자를 노려보세요.' },
                                        { term: 28, rate: settings.rate28d, icon: '🕰️', title: '장기 28일 예금', desc: '인내심의 결실! 가장 높은 이율을 자랑합니다.' }
                                    ].map((product) => (
                                        <div key={product.term} className="bg-white rounded-2xl p-5 shadow-sm border-2 border-[#e6d5c3] flex flex-col sm:flex-row gap-6 items-center hover:border-[#c1905e] transition-colors">
                                            <div className="flex-shrink-0 w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-4xl shadow-inner border border-orange-100">
                                                {product.icon}
                                            </div>
                                            <div className="flex-1 text-center sm:text-left">
                                                <div className="flex items-center justify-center sm:justify-start gap-3 mb-1">
                                                    <h3 className="font-black text-xl text-[#5c3a21]">{product.title}</h3>
                                                    <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded text-sm">연 {product.rate}%</span>
                                                </div>
                                                <p className="text-gray-500 text-sm mb-4">{product.desc}</p>
                                                
                                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                                    <button 
                                                        onClick={() => handleAmountChange(product.term, Math.max(10, amounts[product.term] - 10))}
                                                        className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold hover:bg-gray-300"
                                                    >-</button>
                                                    <div className="bg-gray-50 border border-gray-300 px-4 py-1.5 rounded-lg font-bold text-[#5c3a21] min-w-[100px] text-center">
                                                        {amounts[product.term]} 🍪
                                                    </div>
                                                    <button 
                                                        onClick={() => handleAmountChange(product.term, amounts[product.term] + 10)}
                                                        className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold hover:bg-gray-300"
                                                    >+</button>
                                                    <span className="text-xs text-gray-400 ml-2">(10단위)</span>
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-auto mt-4 sm:mt-0">
                                                <button
                                                    onClick={() => handleBuyDeposit(product.term as 7|14|28)}
                                                    disabled={isProcessing}
                                                    className={`w-full sm:w-32 py-3 rounded-xl font-black shadow-md transform transition-all ${
                                                        isProcessing
                                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white hover:scale-105'
                                                    }`}
                                                >
                                                    {isProcessing ? '처리중...' : '가입하기'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {deposits.length === 0 ? (
                                        <div className="text-center py-20 text-[#8b5a2b]/60">
                                            <div className="text-6xl mb-4">💨</div>
                                            <p className="text-xl font-bold">아직 가입한 예금이 없습니다.</p>
                                            <p className="text-sm mt-2">지금 바로 예금 상품을 구경해보세요!</p>
                                        </div>
                                    ) : (
                                        deposits.map((deposit) => {
                                            const isMatured = new Date(deposit.endDate) <= new Date();
                                            const isCompleted = deposit.status === 'completed';
                                            const interest = Math.floor(deposit.principal * (deposit.interestRate / 100));
                                            
                                            return (
                                                <div key={deposit.id} className={`rounded-2xl p-5 border-2 flex flex-col sm:flex-row items-center gap-4 transition-all ${
                                                    isCompleted ? 'bg-gray-100 border-gray-200 opacity-70' :
                                                    isMatured ? 'bg-yellow-50 border-yellow-300 shadow-md' : 'bg-white border-[#e6d5c3]'
                                                }`}>
                                                    <div className="flex-1 w-full">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded text-xs">{deposit.term}일 만기</span>
                                                                <span className="font-black text-[#5c3a21] text-lg">원금 {deposit.principal}🍪</span>
                                                            </div>
                                                            {isCompleted ? (
                                                                <span className="text-gray-500 font-bold text-sm bg-gray-200 px-2 py-1 rounded">수령 완료</span>
                                                            ) : isMatured ? (
                                                                <span className="text-red-600 font-black text-sm bg-red-100 px-2 py-1 rounded animate-pulse">만기 달성!</span>
                                                            ) : (
                                                                <span className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-1 rounded">진행 중</span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-600 grid grid-cols-2 gap-y-1 bg-white/50 p-3 rounded-lg">
                                                            <div>가입일: {formatDate(deposit.startDate)}</div>
                                                            <div className={isMatured && !isCompleted ? 'text-red-600 font-bold' : ''}>만기일: {formatDate(deposit.endDate)}</div>
                                                            <div>적용 이율: {deposit.interestRate}%</div>
                                                            <div className="font-bold text-green-600">예상 이자: +{interest}🍪</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="w-full sm:w-auto">
                                                        {!isCompleted && (
                                                            <button
                                                                onClick={() => handleClaimDeposit(deposit)}
                                                                disabled={!isMatured || isProcessing}
                                                                className={`w-full sm:w-32 py-3 rounded-xl font-black transition-all shadow-sm ${
                                                                    isMatured && !isProcessing
                                                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white transform hover:scale-105 animate-bounce-slight' 
                                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                {isProcessing ? '처리중...' : '만기 수령'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes bounce-slight {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-slight {
                    animation: bounce-slight 3s ease-in-out infinite;
                }
            `}} />
        </div>
    );
}
