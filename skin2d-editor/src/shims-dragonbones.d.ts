/** dragonbones.js 发布 UMD + 非 module 的 .d.ts，此 shim 供动态 import 通过 vue-tsc */
declare module 'dragonbones.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dragonBones: any
  export default dragonBones
}
