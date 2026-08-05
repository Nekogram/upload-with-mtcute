declare module '*.wasm' {
  const init: () => Promise<unknown>
  export default init
}
