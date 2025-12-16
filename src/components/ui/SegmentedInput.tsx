'use client';

import React, { useRef, useState, useEffect } from 'react';

interface SegmentedInputProps {
    length: number;
    onComplete: (code: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    type?: 'text' | 'number';
}

export function SegmentedInput({ length, onComplete, disabled, autoFocus = false, type = 'text' }: SegmentedInputProps) {
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (autoFocus && !disabled) {
            inputs.current[0]?.focus();
        }
    }, [autoFocus, disabled]);

    const handleChange = (index: number, value: string) => {
        // Enforce type if needed (though text allows numbers)
        // Only allow alphanumeric
        if (!/^[a-zA-Z0-9]*$/.test(value)) return;

        const newValues = [...values];
        const char = value.slice(-1).toUpperCase(); // Take last char
        newValues[index] = char;
        setValues(newValues);

        // Auto-focus move
        if (char && index < length - 1) {
            inputs.current[index + 1]?.focus();
        }

        // Check completion
        if (newValues.every(v => v !== '')) {
            onComplete(newValues.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !values[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, length);

        if (pastedData) {
            const newValues = [...values];
            for (let i = 0; i < pastedData.length; i++) {
                newValues[i] = pastedData[i];
            }
            setValues(newValues);

            if (newValues.every(v => v !== '')) {
                onComplete(newValues.join(''));
            } else {
                const nextIndex = Math.min(pastedData.length, length - 1);
                inputs.current[nextIndex]?.focus();
            }
        }
    };

    return (
        <div className="flex gap-2 justify-center">
            {values.map((value, index) => (
                <input
                    key={index}
                    ref={el => { inputs.current[index] = el }}
                    type={type === 'number' ? 'tel' : 'text'}
                    value={value}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className="w-10 h-10 md:w-12 md:h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none uppercase transition-all disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 placeholder-gray-300"
                    maxLength={1}
                />
            ))}
        </div>
    );
}
