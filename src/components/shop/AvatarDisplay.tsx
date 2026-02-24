import React from 'react';
import { ShopItem } from '@/lib/firebase/core';
import { getProxyImageUrl } from '@/lib/utils';

interface AvatarDisplayProps {
    equippedItems: Record<string, ShopItem>;
    size?: number;
}

export default function AvatarDisplay({ equippedItems, size = 200 }: AvatarDisplayProps) {
    // Layer Order: Background -> Body -> Face -> Outfit -> Hair -> Accessory
    // Z-Index: -10 -> 0 -> 10 -> 20 -> 30 -> 40

    // Base Body Image (Placeholder or Asset)
    // Ideally, this should be a prop or a constant asset path.
    // For now, let's assume a default body image exists or use a placeholder.
    const defaultBodyUrl = '/assets/avatar/base_body.png'; // We need to ensure this exists or use a placeholder div

    return (
        <div
            className="relative bg-blue-50 rounded-3xl overflow-hidden border-4 border-blue-100 flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            {/* Background */}
            {equippedItems.background && equippedItems.background.imageUrl && (
                <img
                    src={getProxyImageUrl(equippedItems.background.imageUrl)}
                    alt="Background"
                    className="absolute top-0 left-0 w-full h-full object-cover rounded-3xl"
                    style={{
                        zIndex: 0, // Changed from -10 to 0 to prevent hiding behind the parent div's background
                        left: `${equippedItems.background.style?.x || 0}%`,
                        top: `${equippedItems.background.style?.y || 0}%`,
                        width: `${equippedItems.background.style?.width || 100}%`,
                        height: '100%',
                    }}
                />
            )}

            {/* Base Body */}
            <img
                src={getProxyImageUrl(defaultBodyUrl)}
                alt="Body"
                className="absolute top-0 left-0 w-full h-full object-contain"
                style={{ zIndex: 0 }}
                onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/200?text=Body'; // Fallback
                }}
            />

            {/* Face */}
            {equippedItems.face && equippedItems.face.imageUrl && (
                <img
                    src={getProxyImageUrl(equippedItems.face.imageUrl)}
                    alt="Face"
                    className="absolute object-contain"
                    style={{
                        zIndex: 10,
                        left: `${equippedItems.face.style?.x || 0}%`,
                        top: `${equippedItems.face.style?.y || 0}%`,
                        width: `${equippedItems.face.style?.width || 100}%`,
                    }}
                />
            )}

            {/* Outfit */}
            {equippedItems.outfit && equippedItems.outfit.imageUrl && (
                <img
                    src={getProxyImageUrl(equippedItems.outfit.imageUrl)}
                    alt="Outfit"
                    className="absolute object-contain"
                    style={{
                        zIndex: 20,
                        left: `${equippedItems.outfit.style?.x || 0}%`,
                        top: `${equippedItems.outfit.style?.y || 0}%`,
                        width: `${equippedItems.outfit.style?.width || 100}%`,
                    }}
                />
            )}

            {/* Hair */}
            {equippedItems.hair && equippedItems.hair.imageUrl && (
                <img
                    src={getProxyImageUrl(equippedItems.hair.imageUrl)}
                    alt="Hair"
                    className="absolute object-contain"
                    style={{
                        zIndex: 30,
                        left: `${equippedItems.hair.style?.x || 0}%`,
                        top: `${equippedItems.hair.style?.y || 0}%`,
                        width: `${equippedItems.hair.style?.width || 100}%`,
                    }}
                />
            )}

            {/* Accessory */}
            {equippedItems.accessory && equippedItems.accessory.imageUrl && (
                <img
                    src={getProxyImageUrl(equippedItems.accessory.imageUrl)}
                    alt="Accessory"
                    className="absolute object-contain"
                    style={{
                        zIndex: 40,
                        left: `${equippedItems.accessory.style?.x || 0}%`,
                        top: `${equippedItems.accessory.style?.y || 0}%`,
                        width: `${equippedItems.accessory.style?.width || 100}%`,
                    }}
                />
            )}
        </div>
    );
}
