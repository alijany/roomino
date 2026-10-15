'use client'

import React from 'react';
import Link from 'next/link';
import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms/ui.button';

export interface PaginationProps {
    itemPerPage: number;
    page: number;
    totalCount: number;
    onNavigate: (page: number) => string | { pathname: string; query?: Record<string, string> };
    className?: string;
}

export function Pagination({
    itemPerPage,
    page,
    totalCount,
    onNavigate,
    className,
}: PaginationProps): React.ReactElement {
    const paginateButtons = [];
    const pageCount = Math.max(1, Math.ceil(totalCount / itemPerPage));

    const start = Math.max(Math.min(pageCount - 2, page - 1), 1);
    const end = Math.min(pageCount, start + 3);

    const rightCount = 1;
    const leftCount = 1;
    const rightEnd = Math.min(start, rightCount + 1);
    const leftStart = Math.max(end, pageCount - leftCount + 1);

    // Create page buttons from 1 to rightEnd
    for (let p = 1; p < rightEnd; p++) {
        paginateButtons.push(
            <PageButton
                key={p}
                page={p}
                currentPage={page}
                onNavigate={onNavigate}
            />
        );
    }

    // Add ellipsis if needed
    if (page > rightCount + 2 && rightEnd !== start) {
        paginateButtons.push(
            <div key="middle1" className="mx-2 flex items-center justify-center">
                <span className="text-slate-500">...</span>
            </div>
        );
    }

    // Create page buttons from start to end
    for (let p = start; p < end; p++) {
        paginateButtons.push(
            <PageButton
                key={p}
                page={p}
                currentPage={page}
                onNavigate={onNavigate}
            />
        );
    }

    // Add ellipsis if needed
    if (page < pageCount - leftCount - 1 && leftStart !== end) {
        paginateButtons.push(
            <div key="middle2" className="mx-2 flex items-center justify-center">
                <span className="text-slate-500">...</span>
            </div>
        );
    }

    // Create page buttons from leftStart to pageCount
    for (let p = leftStart; p <= pageCount; p++) {
        paginateButtons.push(
            <PageButton
                key={p}
                page={p}
                currentPage={page}
                onNavigate={onNavigate}
            />
        );
    }

    if (pageCount < 2) {
        return <></>;
    }

    return (
        <nav
            className={cn("flex justify-center items-center", className)}
            aria-label="Pagination"
        >
            <div dir='ltr' className="flex flex-row space-x-1 lg:space-x-2 justify-center items-center">
                {paginateButtons}
            </div>
        </nav>
    );
}

interface PageButtonProps {
    page: number;
    currentPage: number;
    onNavigate: PaginationProps['onNavigate'];
}

function PageButton({ page, currentPage, onNavigate }: PageButtonProps) {
    const isActive = page === currentPage;
    
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (!isActive) onNavigate(page);
    };
    
    return (
        <Link
            href="#"
            onClick={handleClick}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Page ${page}`}
            className={cn(
                "inline-flex items-center justify-center rounded-lg min-w-[2.5rem] h-10",
                isActive ? "pointer-events-none" : "hover:bg-slate-100"
            )}
        >
            <Button
                variant={isActive ? "primary" : "outline"}
                size="sm"
                disabled={isActive}
                className={cn(
                    "rounded-lg",
                    isActive && "bg-brand-600 text-white"
                )}
            >
                {page}
            </Button>
        </Link>
    );
}
