import { describe, expect, it } from "vitest"

import { problemaDaFoto } from "./fotos"

const MB = 1024 * 1024

describe("problemaDaFoto", () => {
  it("aceita JPG, PNG e WebP até 5 MB", () => {
    expect(problemaDaFoto({ type: "image/jpeg", size: 5 * MB })).toBeNull()
    expect(problemaDaFoto({ type: "image/png", size: 10 })).toBeNull()
    expect(problemaDaFoto({ type: "image/webp", size: 10 })).toBeNull()
  })

  it("recusa acima de 5 MB", () => {
    expect(problemaDaFoto({ type: "image/jpeg", size: 5 * MB + 1 })).toBe("A foto precisa ter até 5 MB.")
  })

  it("recusa outros formatos", () => {
    expect(problemaDaFoto({ type: "application/pdf", size: 10 })).toBe("Use uma foto em JPG, PNG ou WebP.")
  })
})
