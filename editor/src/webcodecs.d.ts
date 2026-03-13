/**
 * Ambient WebCodecs type used by openvideo (packages/openvideo).
 *
 * The openvideo package declares this via @types/dom-webcodecs in its own
 * tsconfig, but when Next.js resolves openvideo source through the path
 * alias ("openvideo" → "../packages/openvideo/src/index.ts"), it uses
 * editor's tsconfig which lacks that type package.
 *
 * This declaration fills the gap without adding @types/dom-webcodecs to
 * editor's dependencies (which would require a restrictive "types" field
 * in tsconfig, breaking auto-discovery of other @types packages).
 */
type HardwarePreference =
  | "no-preference"
  | "prefer-hardware"
  | "prefer-software";
