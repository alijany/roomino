"use client";

import { cn } from "@/libs/style/style.util.helpers";
import React from "react";

const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tehran",
});

/** Weekday, day, month and year in a fixed order, without the locale's commas. */
function formatDate(date: Date) {
    const parts = Object.fromEntries(
        formatter.formatToParts(date).map(({ type, value }) => [type, value]),
    );
    return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`;
}

/** Today's Jalali date, e.g. «یکشنبه ۴ آبان ۱۴۰۵». Rendered after mount so server and client agree. */
export function TodayDate({ className }: { className?: string }) {
    const [label, setLabel] = React.useState("");

    React.useEffect(() => {
        const update = () => setLabel(formatDate(new Date()));
        update();
        // The tab may stay open past midnight.
        const timer = setInterval(update, 60_000);
        return () => clearInterval(timer);
    }, []);

    return (
        <time dateTime={new Date().toISOString().slice(0, 10)} className={cn("text-sm text-slate-500", className)}>
            {label}
        </time>
    );
}
