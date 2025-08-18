declare namespace React {
  type FC<P = any> = (props: P) => any;
  type PropsWithChildren<P = any> = P & { children?: any };
  const StrictMode: any;
  const Fragment: any;
  function useState<T = any>(init?: T | (() => T)): [T, (v: T) => void];
  function useEffect(effect: (...args: any[]) => any, deps?: any[]): void;
  function useMemo<T = any>(factory: () => T, deps?: any[]): T;
  function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T;
  function useContext<T = any>(ctx: any): T;
  function createContext<T = any>(defaultValue?: T): any;
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
