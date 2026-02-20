'use client';

import { useState, useEffect } from 'react';
import { firebaseService } from '@/lib/firebase/core';
import { dahandinClient } from '@/lib/dahandin/client';
import { SegmentedInput } from '@/components/ui/SegmentedInput';
import { DahandinClass } from '@/types';

export default function LoginPage() {
    const [view, setView] = useState<'main' | 'teacher-login' | 'teacher-register' | 'student' | 'admin-login'>('main');

    // --- STUDENT STATE ---
    const [inviteCode, setInviteCode] = useState('');
    const [teacherInfo, setTeacherInfo] = useState<any>(null);
    const [studentCode, setStudentCode] = useState('');
    const [studentTeacherId, setStudentTeacherId] = useState('');

    // --- TEACHER STATE ---
    const [apiKey, setApiKey] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [teacherName, setTeacherName] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [classes, setClasses] = useState<DahandinClass[]>([]);
    const [selectedClass, setSelectedClass] = useState<DahandinClass | null>(null);

    // Login specific state
    const [loginTeacherId, setLoginTeacherId] = useState('');

    // --- ADMIN STATE ---
    const [adminId, setAdminId] = useState('');
    const [adminPw, setAdminPw] = useState('');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        localStorage.clear();
    }, []);

    // --- UTILS ---
    const resetState = () => {
        setInviteCode('');
        setTeacherInfo(null);
        setStudentCode('');
        setStudentTeacherId('');

        setApiKey('');
        setTeacherId('');
        setSchoolName('');
        setTeacherName('');
        setLoginTeacherId('');
        setIsVerified(false);
        setClasses([]);
        setSelectedClass(null);

        setAdminId('');
        setAdminPw('');
    };

    // --- ADMIN LOGIN LOGIC ---
    const handleAdminLogin = () => {
        if (!adminId || !adminPw) {
            alert("아이디와 비밀번호를 입력해주세요.");
            return;
        }

        if (adminId === 'adminID' && adminPw === 'eodbs1028') {
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('teacherId', 'adminID');
            // Admin manages GLOBAL items, but might also need to see how they look in a class context?
            // For now, setting a 'GLOBAL' placeholder. The ShopSystem needs to handle this.
            localStorage.setItem('classCode', 'GLOBAL');

            alert("관리자 모드로 로그인합니다.");
            window.location.href = '/shop';
        } else {
            alert("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
    };

    // --- TEACHER LOGIN LOGIC ---
    // ... (existing code)

    // ... (lines 48-185 same as before, skipping for brevity in replacement but keeping context)
    // Actually, I must be careful with replace_file_content to not lose lines if I don't select them.
    // I will use StartLine/EndLine carefully or include the whole block if easier.

    // I will replace from "const [view, setView]..." down to the end of the return statement to ensure structure.
    // But that's too large. Let's do it in chunks or careful replacement.

    // Chunk 1: State & Handlers
    // I'll rewrite the component start to include Admin state and handler.

    // Wait, I can't easily reference "lines 48-185 same as before" in `ReplacementContent`. 
    // I must provide the *exact* replacement text.

    // Let's rely on the previous content known.
    // I will replace everything from function start to `return (` to inject the admin logic.
    // Then I will replace the JSX part to inject the view.

    // Actually, I'll do one big replacement for strict correctness since the file is < 300 lines.
    // It's safer to ensure I don't miss a closing brace.

    const handleTeacherLogin = async () => {
        if (!loginTeacherId || !apiKey) return;
        setLoading(true);
        try {
            // Check if ID exists in DB
            const teacherData = await firebaseService.getTeacherInfo(loginTeacherId);

            if (teacherData) {
                // Security Check: Verify API Key matches registered key
                if (teacherData.apiKey !== apiKey) {
                    alert("API Key가 일치하지 않습니다.\n본인의 API Key를 입력해주세요.");
                    setLoading(false);
                    return;
                }

                // Login Success
                localStorage.setItem('apiKey', teacherData.apiKey);
                localStorage.setItem('userRole', 'teacher');
                localStorage.setItem('classCode', teacherData.classCode);
                localStorage.setItem('className', teacherData.className);
                localStorage.setItem('teacherId', loginTeacherId);

                window.location.href = '/shop';
            } else {
                alert("등록되지 않은 선생님 ID입니다.\n먼저 회원가입을 진행해주세요.");
            }
        } catch (error: any) {
            alert("로그인 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- TEACHER REGISTER LOGIC ---
    const handleVerifyApiKey = async () => {
        if (!apiKey) return;
        setLoading(true);
        try {
            const response = await dahandinClient.getClassList(apiKey);
            if (response.result && response.data) {
                setClasses(response.data);
                setIsVerified(true);
            } else {
                alert('API Key가 유효하지 않습니다.');
            }
        } catch (error) {
            alert('API Key 확인 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleTeacherRegister = async () => {
        if (!teacherId || !selectedClass || !schoolName || !teacherName) {
            alert("모든 정보를 입력해주세요.");
            return;
        }
        setLoading(true);
        try {
            // Check if ID already exists
            const existing = await firebaseService.getTeacherInfo(teacherId);
            if (existing) {
                alert("이미 존재하는 ID입니다. 다른 ID를 사용해주세요.");
                return;
            }

            // Register
            const classCode = selectedClass.code || selectedClass.name;
            await firebaseService.registerTeacher(teacherId, "nopassword", apiKey, selectedClass.name, classCode, schoolName, teacherName);

            alert(`회원가입이 완료되었습니다!\n이제 [${teacherId}] ID로 로그인할 수 있습니다.`);
            setView('teacher-login');
            setLoginTeacherId(teacherId); // Prefill login
        } catch (error: any) {
            alert("가입 처리 중 오류 발생: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- STUDENT LOGIC ---
    const checkTeacherIdForStudent = async (tId: string) => {
        if (!tId) return;
        setLoading(true);
        try {
            // Check if Teacher ID exists in DB
            const info = await firebaseService.getTeacherInfo(tId);

            if (info) {
                setTeacherInfo(info);
            } else {
                alert("등록되지 않은 선생님 아이디입니다. 아이디를 다시 확인해주세요.");
            }
        } catch (error) {
            console.error(error);
            alert("선생님 정보 확인 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleStudentLogin = async (sCode: string) => {
        if (!teacherInfo) return;
        setLoading(true);
        setStudentCode(sCode);

        try {
            // sCode is now the Student Unique ID (Invite Code)
            const response = await dahandinClient.getStudentTotal(sCode, teacherInfo.apiKey);
            if (response.result && response.data) {
                const studentData = response.data;

                localStorage.setItem('apiKey', teacherInfo.apiKey);
                localStorage.setItem('userRole', 'student');
                localStorage.setItem('studentCode', studentData.code);
                localStorage.setItem('studentName', studentData.name);
                localStorage.setItem('studentNumber', studentData.number.toString());
                localStorage.setItem('studentCookie', studentData.totalCookie.toString());
                localStorage.setItem('classCode', teacherInfo.classCode);
                localStorage.setItem('className', teacherInfo.className);

                window.location.href = '/shop';
            } else {
                alert('학생 코드가 올바르지 않습니다.');
            }
        } catch (error: any) {
            console.error(error);
            alert('로그인 오류: ' + (error.message || '알 수 없음'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
            {/* Admin Login Button (Top Right) */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={() => { setView('admin-login'); resetState(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-full text-xs font-bold text-gray-600 transition-colors"
                >
                    <span>🛠</span> 관리자 로그인
                </button>
            </div>

            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">

                {/* Header */}
                <div className={`p-8 text-center transition-colors duration-300 ${view.startsWith('teacher') || view === 'admin-login' ? 'bg-gray-800' : 'bg-indigo-600'}`}>
                    <h1 className="text-3xl font-black text-white mb-2">다했니 월드</h1>
                    <p className={`font-medium ${view.startsWith('teacher') || view === 'admin-login' ? 'text-gray-300' : 'text-indigo-100'}`}>
                        {view === 'main' && "우리 반 친구들과 함께해요!"}
                        {view === 'student' && "학생 로그인"}
                        {view === 'teacher-login' && "선생님 로그인"}
                        {view === 'teacher-register' && "선생님 회원가입"}
                        {view === 'admin-login' && "관리자 로그인"}
                    </p>
                </div>

                <div className="p-8">
                    {/* VIEW: MAIN */}
                    {view === 'main' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => { setView('student'); resetState(); }}
                                className="w-full py-6 rounded-2xl border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group flex flex-col items-center justify-center gap-2"
                            >
                                <span className="text-4xl">🎓</span>
                                <span className="text-xl font-bold text-gray-800 group-hover:text-indigo-700">학생 입장하기</span>
                            </button>
                            <button
                                onClick={() => { setView('teacher-login'); resetState(); }}
                                className="w-full py-4 rounded-xl text-gray-400 hover:text-gray-600 font-medium text-sm transition-colors"
                            >
                                선생님이신가요?
                            </button>
                        </div>
                    )}

                    {/* VIEW: ADMIN LOGIN */}
                    {view === 'admin-login' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <button onClick={() => setView('main')} className="text-gray-400 hover:text-gray-600 text-sm font-bold">← 뒤로가기</button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">관리자 아이디</label>
                                <input
                                    type="text"
                                    value={adminId}
                                    onChange={(e) => setAdminId(e.target.value)}
                                    placeholder="관리자 ID"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none font-bold text-lg mb-4"
                                />
                                <label className="block text-sm font-bold text-gray-700 mb-2">비밀번호</label>
                                <input
                                    type="password"
                                    value={adminPw}
                                    onChange={(e) => setAdminPw(e.target.value)}
                                    placeholder="비밀번호"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none text-lg"
                                />
                            </div>

                            <button
                                onClick={handleAdminLogin}
                                disabled={!adminId || !adminPw}
                                className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold text-lg hover:bg-gray-900 shadow-lg transform transition active:scale-95 disabled:bg-gray-300 disabled:transform-none"
                            >
                                관리자 입장
                            </button>
                        </div>
                    )}

                    {/* VIEW: TEACHER LOGIN */}
                    {view === 'teacher-login' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <button onClick={() => setView('main')} className="text-gray-400 hover:text-gray-600 text-sm font-bold">← 뒤로가기</button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">선생님 ID</label>
                                <input
                                    type="text"
                                    value={loginTeacherId}
                                    onChange={(e) => setLoginTeacherId(e.target.value)}
                                    placeholder="아이디를 입력하세요"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none font-bold text-lg mb-4"
                                />
                                <label className="block text-sm font-bold text-gray-700 mb-2">다했니 API Key (비밀번호)</label>
                                <input
                                    type="text"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="본인의 API Key를 입력하세요"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none text-sm"
                                />
                                <p className="text-xs text-red-500 mt-1">※ 학생들의 무단 접속 방지를 위해 API Key 인증이 필요합니다.</p>
                            </div>

                            <button
                                onClick={handleTeacherLogin}
                                disabled={loading || !loginTeacherId || !apiKey}
                                className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold text-lg hover:bg-gray-900 shadow-lg transform transition active:scale-95 disabled:bg-gray-300 disabled:transform-none"
                            >
                                {loading ? '인증 및 입장...' : '입장하기'}
                            </button>

                            <div className="text-center pt-4 border-t border-gray-100">
                                <p className="text-sm text-gray-500 mb-2">아직 계정이 없으신가요?</p>
                                <button
                                    onClick={() => { setView('teacher-register'); resetState(); }}
                                    className="text-gray-800 font-bold hover:underline"
                                >
                                    선생님 회원가입
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VIEW: TEACHER REGISTER */}
                    {view === 'teacher-register' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <button onClick={() => setView('teacher-login')} className="text-gray-400 hover:text-gray-600 text-sm font-bold">← 로그인으로</button>
                            </div>

                            {/* Step 1: API Key */}
                            <div className={`transition-opacity duration-300 ${isVerified ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <label className="block text-sm font-bold text-gray-700 mb-2">다했니 API Key</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="API Key 입력"
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none"
                                        disabled={isVerified}
                                    />
                                    <button
                                        onClick={handleVerifyApiKey}
                                        disabled={loading || isVerified || !apiKey}
                                        className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 disabled:bg-gray-300"
                                    >
                                        인증
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: ID & Class & School Info (Only after verify) */}
                            {isVerified && (
                                <div className="animate-fade-in-up space-y-4 border-t pt-6">
                                    <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                        <span>✅</span> API Key 인증 완료
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">학교명</label>
                                        <input
                                            type="text"
                                            value={schoolName}
                                            onChange={(e) => setSchoolName(e.target.value)}
                                            placeholder="예: 다했니초등학교"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">선생님 성함</label>
                                        <input
                                            type="text"
                                            value={teacherName}
                                            onChange={(e) => setTeacherName(e.target.value)}
                                            placeholder="선생님 성함을 입력하세요"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">사용할 선생님 ID</label>
                                        <input
                                            type="text"
                                            value={teacherId}
                                            onChange={(e) => setTeacherId(e.target.value)}
                                            placeholder="아이디를 입력하세요"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none font-bold text-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">소속 학급 선택</label>
                                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1 custom-scrollbar">
                                            {classes.map(cls => (
                                                <button
                                                    key={cls.code || cls.name}
                                                    onClick={() => setSelectedClass(cls)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedClass?.name === cls.name ? 'bg-gray-800 text-white font-bold' : 'hover:bg-gray-100 text-gray-700'}`}
                                                >
                                                    {cls.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleTeacherRegister}
                                        disabled={loading || !teacherId || !selectedClass || !schoolName || !teacherName}
                                        className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold text-lg hover:bg-gray-900 shadow-lg transform transition active:scale-95 disabled:bg-gray-300 disabled:transform-none"
                                    >
                                        {loading ? '가입 완료' : '가입하기'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW: STUDENT */}
                    {view === 'student' && (
                        <div className="space-y-8 text-center">
                            <div className="flex justify-start">
                                <button onClick={() => setView('main')} className="text-gray-400 hover:text-gray-600 text-sm font-bold">← 뒤로가기</button>
                            </div>

                            {!teacherInfo ? (
                                <div className="animate-fade-in-up text-left">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">선생님 확인</h3>

                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">선생님 아이디</label>
                                        <input
                                            type="text"
                                            value={studentTeacherId}
                                            onChange={(e) => setStudentTeacherId(e.target.value)}
                                            placeholder="선생님이 알려주신 아이디를 입력하세요"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none"
                                        />
                                    </div>

                                    <button
                                        onClick={() => checkTeacherIdForStudent(studentTeacherId)}
                                        disabled={loading || !studentTeacherId}
                                        className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold text-lg hover:bg-gray-900 shadow-lg"
                                    >
                                        선생님 찾기
                                    </button>
                                </div>
                            ) : (
                                <div className="animate-fade-in-up">
                                    <div className="bg-indigo-50 p-4 rounded-xl mb-6">
                                        <div className="text-sm text-indigo-600 font-bold mb-1">인증된 학급</div>
                                        <div className="text-2xl font-black text-indigo-800">{teacherInfo.className}</div>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-800 mb-6">학생 코드를 입력하세요</h3>
                                    <div className="mb-4">
                                        {/* Student Code (Invite Code) - 9 chars */}
                                        <SegmentedInput
                                            length={9}
                                            onComplete={handleStudentLogin}
                                            disabled={loading}
                                            type="text"
                                            autoFocus={true}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400">내 &apos;다했니&apos; 학생 코드 9자리를 입력해주세요.</p>

                                    <button
                                        onClick={() => { setTeacherInfo(null); setStudentTeacherId(''); }}
                                        className="text-sm text-gray-400 underline hover:text-gray-600 mt-4"
                                    >
                                        선생님 아이디 다시 입력하기
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e5e7eb;
                    border-radius: 20px;
                }
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
