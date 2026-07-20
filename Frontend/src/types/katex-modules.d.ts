declare module 'katex/contrib/auto-render' {
  interface Delimiter { left: string; right: string; display: boolean }
  interface Options { delimiters?: Delimiter[]; throwOnError?: boolean; ignoredTags?: string[] }
  const renderMathInElement: (element: HTMLElement, options?: Options) => void
  export default renderMathInElement
}
declare module 'katex/contrib/mhchem'
