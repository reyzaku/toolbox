declare module 'nearest-color' {
  interface NearestColorResult {
    name: string
    value: string
    rgb: { r: number; g: number; b: number }
    distance: number
  }
  interface NearestColorFn {
    (hex: string): NearestColorResult | null
  }
  function from(colors: Record<string, string>): NearestColorFn
  export default { from }
}

declare module 'name-that-color' {
  interface NTC {
    init(): void
    name(hex: string): [string, string, boolean]
  }
  const ntc: NTC
  export default ntc
}
