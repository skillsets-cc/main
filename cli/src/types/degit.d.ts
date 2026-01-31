declare module 'degit' {
  interface DegitOptions {
    cache?: boolean;
    force?: boolean;
    verbose?: boolean;
  }

  interface Emitter {
    clone(dest: string): Promise<void>;
    on(event: string, callback: (info: unknown) => void): void;
  }

  function degit(src: string, opts?: DegitOptions): Emitter;
  export default degit;
}
