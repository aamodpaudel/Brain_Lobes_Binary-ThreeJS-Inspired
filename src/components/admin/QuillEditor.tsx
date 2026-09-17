'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

if (typeof window !== 'undefined') {
    (window as unknown as { katex: typeof katex }).katex = katex;
}

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <p>Loading editor…</p> });

const baseToolbar = [
    [{ size: [] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'formula'],
    ['clean'],
];

const quillModules = { toolbar: baseToolbar };
// Bio and domain descriptions are short, centered blurbs shown inside a narrow box — alignment
// is useful there in a way it isn't for note content, so only those editors get the button.
const quillModulesWithAlign = { toolbar: [[{ align: [] }], ...baseToolbar] };

export function QuillEditor({ value, onChange, align }: { value: string; onChange: (val: string) => void; align?: boolean }) {
    const [content, setContent] = useState(value);

    useEffect(() => {
        if (value !== content && !content) setContent(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <div className="rounded-md bg-white text-black">
            <ReactQuill
                theme="snow"
                modules={align ? quillModulesWithAlign : quillModules}
                value={content}
                onChange={(val) => {
                    setContent(val);
                    onChange(val);
                }}
            />
        </div>
    );
}
