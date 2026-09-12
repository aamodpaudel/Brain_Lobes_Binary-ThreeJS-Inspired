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

const quillModules = {
    toolbar: [
        [{ size: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'formula'],
        ['clean'],
    ],
};

export function QuillEditor({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [content, setContent] = useState(value);

    useEffect(() => {
        if (value !== content && !content) setContent(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <div className="rounded-md bg-white text-black">
            <ReactQuill
                theme="snow"
                modules={quillModules}
                value={content}
                onChange={(val) => {
                    setContent(val);
                    onChange(val);
                }}
            />
        </div>
    );
}
