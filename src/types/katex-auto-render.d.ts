declare module 'katex/dist/contrib/auto-render' {
    interface AutoRenderDelimiter {
        left: string;
        right: string;
        display: boolean;
    }

    interface AutoRenderOptions {
        delimiters?: AutoRenderDelimiter[];
        throwOnError?: boolean;
        ignoredTags?: string[];
        ignoredClasses?: string[];
        errorCallback?: (msg: string, err: unknown) => void;
    }

    export default function renderMathInElement(element: HTMLElement, options?: AutoRenderOptions): void;
}
