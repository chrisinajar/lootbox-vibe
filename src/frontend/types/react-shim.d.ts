declare namespace React {
  type FC<P = any> = (props: P) => any;
  const StrictMode: any;
  const Fragment: any;
  function useState<T = any>(init?: T | (() => T)): [T, (v: T) => void];
  function useEffect(effect: (...args: any[]) => any, deps?: any[]): void;
  function createElement(...args: any[]): any;
}

declare module 'react' {
  export = React;
}

declare module 'react-dom/client' {
  export const createRoot: any;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
