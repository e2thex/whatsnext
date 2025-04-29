export const pipe = <T>(...fns: ((arg: T) => T)[]) => (x: T): T => 
  fns.reduce((v, f) => f(v), x); 