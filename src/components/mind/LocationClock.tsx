'use client';

import { useEffect, useState } from 'react';

const TIME_ZONE = 'America/Los_Angeles';

function formatNow(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'shortGeneric',
    }).formatToParts(new Date());

    const time = parts
        .filter((p) => p.type !== 'timeZoneName')
        .map((p) => p.value)
        .join('')
        .trim();
    const zone = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';

    return `${time} ${zone}`;
}

/** San Francisco time, bottom-right of the page. Starts as null and fills in after mount —
 * computing it on the server would bake in the server's clock/timezone, not the visitor's. */
export function LocationClock() {
    const [now, setNow] = useState<string | null>(null);

    useEffect(() => {
        setNow(formatNow());
        const id = setInterval(() => setNow(formatNow()), 30_000);
        return () => clearInterval(id);
    }, []);

    if (!now) return null;

    return (
        <div
            className="fixed bottom-3 right-3 z-30 rounded-md border px-2.5 py-1 text-[11px] opacity-70 backdrop-blur-md sm:bottom-4 sm:right-4"
            style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-topbar-bg)', color: 'var(--muted)' }}
        >
            San Francisco · {now}
        </div>
    );
}
