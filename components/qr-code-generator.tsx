"use client"

import { QRCodeCanvas } from 'qrcode.react'

interface QRCodeGeneratorProps {
    value: string
    size?: number
}

export function QRCodeGenerator({ value, size = 128 }: QRCodeGeneratorProps) {
    return (
        <div className="bg-white p-2 rounded-lg shadow-sm">
            <QRCodeCanvas value={value} size={size} />
        </div>
    )
}
