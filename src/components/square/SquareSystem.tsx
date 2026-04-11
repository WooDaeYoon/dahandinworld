'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { firebaseService, SquareParticipant, ChatMessage, ShopItem } from '@/lib/firebase/core';
import AvatarDisplay from '../shop/AvatarDisplay';
import { getProxyImageUrl } from '@/lib/utils';

export default function SquareSystem() {
    const router = useRouter();
    const [classCode, setClassCode] = useState<string | null>(null);
    const [studentCode, setStudentCode] = useState<string | null>(null);
    const [studentName, setStudentName] = useState<string | null>(null);

    const [participants, setParticipants] = useState<SquareParticipant[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<SquareParticipant | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');

    const [isTeacherMessageModalOpen, setIsTeacherMessageModalOpen] = useState(false);
    const [teacherMessageText, setTeacherMessageText] = useState('');
    const [isSendingTeacherMessage, setIsSendingTeacherMessage] = useState(false);

    // For speech bubbles: Map studentCode -> { message, expiresAt }
    const [bubbles, setBubbles] = useState<Record<string, { message: string, expiresAt: number }>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasJoinedRef = useRef(false);

    // Pre-define default square config
    const [squareConfig, setSquareConfig] = useState<{ 
        background: string;
        isRestricted?: boolean;
        allowedTimeSlots?: { start: string, end: string }[];
    }>({ background: 'bg.png' });

    useEffect(() => {
        const storedClass = localStorage.getItem('classCode');
        const storedCode = localStorage.getItem('studentCode');
        const storedName = localStorage.getItem('studentName');

        if (storedClass && storedCode && storedName) {
            setClassCode(storedClass);
            setStudentCode(storedCode);
            setStudentName(storedName);

            // Join Square
            joinSquare(storedClass, storedCode, storedName);
        } else {
            alert("로그인 정보가 없습니다.");
            router.replace('/login');
        }

        return () => {
            if (storedClass && storedCode) {
                firebaseService.leaveSquare(storedClass, storedCode);
            }
        };
    }, []);

    // Heartbeat for square presence
    useEffect(() => {
        if (!classCode || !studentCode) return;
        
        const heartbeatInterval = setInterval(() => {
            firebaseService.updateSquareHeartbeat(classCode, studentCode);
        }, 60000); // Every 1 minute
        
        return () => clearInterval(heartbeatInterval);
    }, [classCode, studentCode]);

    // Subscribe to Data
    useEffect(() => {
        if (!classCode) return;

        const unsubParticipants = firebaseService.subscribeToSquare(classCode, (users) => {
            setParticipants(users);
        });

        // Config Subscription
        const unsubConfig = firebaseService.subscribeToSquareConfig(classCode, (config) => {
            if (config) {
                setSquareConfig({ 
                    background: config.background || 'bg.png',
                    isRestricted: config.isRestricted,
                    allowedTimeSlots: config.allowedTimeSlots
                });
            }
        });

        const unsubChat = firebaseService.subscribeToChat(classCode, (msgs) => {
            setMessages(msgs);
            // Update bubbles for new messages
            const now = Date.now();
            const newBubbles = { ...bubbles };
            let hasUpdate = false;

            msgs.forEach(msg => {
                // Check if message is recent (< 3 seconds)
                const msgTime = msg.timestamp ? msg.timestamp.toMillis() : Date.now();
                if (Date.now() - msgTime < 3000) {
                    // Verify if we already have this bubble
                    if (!newBubbles[msg.studentCode] || newBubbles[msg.studentCode].message !== msg.message) {
                        newBubbles[msg.studentCode] = { message: msg.message, expiresAt: Date.now() + 3000 };
                        hasUpdate = true;
                    }
                }
            });

            if (hasUpdate) setBubbles(newBubbles);
        });

        return () => {
            unsubParticipants();
            unsubConfig();
            unsubChat();
        };
    }, [classCode]);

    // Handle Kicked Out (Detect if self is removed from participants)
    useEffect(() => {
        if (!studentCode) return;

        const amIParticipant = participants.some(p => p.studentCode === studentCode);

        if (amIParticipant) {
            hasJoinedRef.current = true;
        } else if (hasJoinedRef.current && !amIParticipant) {
            hasJoinedRef.current = false;
            // Delay alert slightly to let DOM unmount processing finish properly
            setTimeout(() => {
                alert("선생님에 의해 광장에서 내보내졌습니다.");
                router.replace('/shop');
            }, 100);
        }
    }, [participants, studentCode, router]);

    // Cleanup bubbles timer
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            setBubbles(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(key => {
                    if (next[key].expiresAt < now) {
                        delete next[key];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 500);
        return () => clearInterval(timer);
    }, []);

    // Enforce Time Restrictions
    useEffect(() => {
        if (!squareConfig.isRestricted) return; // Not restricted, do nothing
        
        const checkTime = () => {
            const now = new Date();
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMinutes = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHours}:${currentMinutes}`;
            
            const slots = squareConfig.allowedTimeSlots || [];
            
            // If restricted but no time slots are added, it means "always closed"
            if (slots.length === 0) {
                return false;
            }
            
            for (const slot of slots) {
                // Time comparison works as string comparison for HH:mm format
                if (currentTimeStr >= slot.start && currentTimeStr <= slot.end) {
                    return true;
                }
            }
            return false;
        };

        const enforce = () => {
            if (!checkTime()) {
                alert("현재는 광장 접속 허용 시간이 아닙니다.");
                if (classCode && studentCode) {
                    firebaseService.leaveSquare(classCode, studentCode);
                }
                router.replace('/shop');
            }
        };

        // Check immediately
        enforce();
        
        // Then check every 10 seconds
        const interval = setInterval(enforce, 10000);
        return () => clearInterval(interval);
        
    }, [squareConfig.isRestricted, squareConfig.allowedTimeSlots, classCode, studentCode, router]);

    // Scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const joinSquare = async (cCode: string, sCode: string, sName: string) => {
        try {
            // Fetch equipped items first
            const equipped = await firebaseService.getEquippedItems(cCode, sCode);
            await firebaseService.enterSquare(cCode, sCode, sName, equipped);
        } catch (error) {
            console.error("Failed to enter square:", error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !classCode || !studentCode || !studentName) return;

        try {
            await firebaseService.sendChatMessage(classCode, studentCode, studentName, inputText);
            setInputText('');
        } catch (error) {
            console.error(error);
        }
    };

    const handleSendTeacherMessage = async () => {
        if (!teacherMessageText.trim() || !classCode || !studentCode || !studentName) return;
        
        setIsSendingTeacherMessage(true);
        try {
            await firebaseService.sendTeacherMessage(classCode, studentCode, studentName, teacherMessageText);
            setTeacherMessageText('');
            setIsTeacherMessageModalOpen(false);
            alert("선생님께 편지가 전달되었습니다!");
        } catch (error) {
            console.error(error);
            alert("전송 중 오류가 발생했습니다.");
        } finally {
            setIsSendingTeacherMessage(false);
        }
    };

    const handleExit = async () => {
        if (classCode && studentCode) {
            await firebaseService.leaveSquare(classCode, studentCode);
        }
        router.push('/shop');
    };

    const handleLogout = async () => {
        if (classCode && studentCode) {
            await firebaseService.leaveSquare(classCode, studentCode);
        }
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <div className="flex flex-col h-screen bg-green-50 overflow-hidden" translate="no">
            {/* Header */}
            <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🌳</span>
                    <h1 className="text-xl font-bold text-gray-800">다했니 광장</h1>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                        {participants.length}명 접속 중
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsTeacherMessageModalOpen(true)}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-bold text-sm flex items-center gap-1"
                    >
                        <span>📨</span> 선생님께 편지쓰기
                    </button>
                    <button
                        onClick={handleExit}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-bold text-sm"
                    >
                        상점으로 돌아가기
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-bold text-sm"
                    >
                        로그아웃
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Square Area (Avatars) */}
                <div
                    className="flex-1 relative p-8 pt-24 overflow-y-auto custom-scrollbar bg-cover bg-center bg-no-repeat transition-all duration-500"
                    style={{
                        backgroundImage: `url('/images/square/${squareConfig.background || 'bg.png'}')`,
                        backgroundColor: '#d1fae5' // fallback green-50
                    }}
                >
                    {/* Shadow overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

                    {/* Avatars Container */}
                    <div className="flex flex-wrap gap-12 justify-center content-start min-h-full relative z-10 w-full">
                        {participants.map((user) => (
                            <div key={user.studentCode} className="relative flex flex-col items-center">
                                {/* Speech Bubble */}
                                {bubbles[user.studentCode] && (
                                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-2xl shadow-lg border border-gray-100 z-20 whitespace-nowrap animate-bounce-slight key-bubble">
                                        <div className="text-gray-800 font-medium text-sm">{bubbles[user.studentCode].message}</div>
                                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-b border-r border-gray-100"></div>
                                    </div>
                                )}

                                {/* Avatar */}
                                <div 
                                    className="relative transform transition-transform hover:scale-110 duration-300 drop-shadow-xl cursor-pointer"
                                    onClick={() => setSelectedParticipant(user)}
                                >
                                    <AvatarDisplay
                                        equippedItems={user.avatarConfig || {}}
                                        size={140}
                                    />
                                    {/* Name Tag */}
                                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm whitespace-nowrap shadow-md">
                                        {user.name}
                                    </div>
                                    {/* Me Indicator */}
                                    {user.studentCode === studentCode && (
                                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-yellow-400 animate-bounce drop-shadow"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Sidebar: Chat */}
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b border-gray-100 bg-indigo-50">
                        <h2 className="font-bold text-indigo-900 flex items-center gap-2">
                            💬 실시간 채팅
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((msg) => {
                            const isMe = msg.studentCode === studentCode;

                            // Format timestamp to "2026-02-20, 14:26pm"
                            let timeString = '';
                            if (msg.timestamp) {
                                const date = msg.timestamp.toDate(); // timestamp is Firestore Timestamp
                                const yyyy = date.getFullYear();
                                const mm = String(date.getMonth() + 1).padStart(2, '0');
                                const dd = String(date.getDate()).padStart(2, '0');
                                const hours = date.getHours();
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                const ampm = hours >= 12 ? 'pm' : 'am';

                                // Convert 24h to 12h format or keep 24h but with pm/am suffix?
                                // "14:26pm" is redundant but requested. I will output exactly as requested: "HH:MMam/pm" where HH is 24-hr if requested, 
                                // wait, "14:26pm" implies 24 hour output + am/pm.
                                // Let's just output `hours` as is, padded.
                                const paddedHours = String(hours).padStart(2, '0');
                                timeString = `${yyyy}-${mm}-${dd}, ${paddedHours}:${minutes}${ampm}`;
                            }

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex item-center mb-1 gap-1">
                                        {!isMe && <span className="text-xs text-gray-500 font-medium">{msg.studentName}</span>}
                                    </div>
                                    <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`px-3 py-2 rounded-lg text-sm max-w-[90%] break-words shadow-sm ${isMe
                                            ? 'bg-indigo-500 text-white rounded-tr-none'
                                            : 'bg-white text-gray-700 border border-gray-200 rounded-tl-none'
                                            }`}>
                                            {msg.message}
                                        </div>
                                        {timeString && (
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap mb-1">
                                                {timeString}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 border-t border-gray-200 bg-white">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="메시지 입력..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                maxLength={50}
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim()}
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 font-bold text-sm"
                            >
                                전송
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .key-bubble {
                    animation: float 2s ease-in-out infinite;
                }
                @keyframes float {
                    0%, 100% { transform: translate(-50%, 0); }
                    50% { transform: translate(-50%, -5px); }
                }
            `}</style>

            {/* Teacher Message Modal */}
            {isTeacherMessageModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex justify-between items-center">
                            <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                                <span>📨</span> 선생님께 편지쓰기
                            </h3>
                            <button onClick={() => setIsTeacherMessageModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                                &times;
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-600 mb-4">
                                광장에서 선생님에게 하고 싶은 말이나 질문이 있다면 적어주세요. 선생님의 확인용 편지함으로 전송됩니다.
                            </p>
                            <textarea
                                value={teacherMessageText}
                                onChange={(e) => setTeacherMessageText(e.target.value)}
                                placeholder="여기에 내용을 입력하세요..."
                                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none resize-none mb-4"
                                maxLength={200}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsTeacherMessageModalOpen(false)}
                                    className="flex-1 py-2 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSendTeacherMessage}
                                    disabled={!teacherMessageText.trim() || isSendingTeacherMessage}
                                    className="flex-1 py-2 font-bold text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSendingTeacherMessage ? '전송 중...' : '보내기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Student Detail Modal */}
            {selectedParticipant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedParticipant(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative flex flex-col" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedParticipant(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 z-10 p-1 bg-white rounded-full transition-colors border shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        <div className="p-6 border-b text-center relative bg-gradient-to-b from-green-50 to-white">
                            <div className="mx-auto w-32 h-32 mt-2 mb-4 bg-white rounded-full shadow-inner border border-green-100 flex items-center justify-center relative overflow-hidden">
                                <AvatarDisplay equippedItems={selectedParticipant.avatarConfig || {}} size={120} />
                            </div>
                            <h3 className="text-xl font-black text-gray-800">{selectedParticipant.name}</h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">
                                {selectedParticipant.studentCode === studentCode ? '내 아바타' : '친구 아바타'}
                            </p>
                        </div>
                        
                        <div className="p-6 bg-gray-50 flex-1 overflow-y-auto">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                                    <span>👕</span> 착용 중인 아이템
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {['background', 'hair', 'face', 'outfit', 'accessory', 'cookie'].map(category => {
                                        const item = selectedParticipant.avatarConfig?.[category];
                                        return (
                                            <div key={category} className="border border-gray-100 rounded-lg p-2 flex flex-col items-center bg-gray-50 text-center">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden mb-1 border border-gray-100">
                                                    {item?.imageUrl ? (
                                                        <img src={getProxyImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-gray-300 text-[10px]">없음</span>
                                                    )}
                                                </div>
                                                <div className="text-[9px] font-bold text-gray-400 mb-0.5">{
                                                    category === 'background' ? '배경' :
                                                    category === 'hair' ? '헤어' :
                                                    category === 'face' ? '얼굴' :
                                                    category === 'outfit' ? '의상' :
                                                    category === 'accessory' ? '액세서리' : '쿠키맛'
                                                }</div>
                                                <div className="text-[10px] font-bold text-gray-700 break-all line-clamp-1 w-full leading-tight" title={item?.name || '미착용'}>
                                                    {item?.name || '미착용'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
