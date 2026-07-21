/**
 * Content-based image classification.
 *
 * This is the control that decides what gets stored and what `Content-Type` it
 * is served with, so these cases are the security boundary, not a formatting
 * nicety. The ones that matter most are the rejections: anything that slips
 * through here ends up served from our own origin.
 *
 * Pure — no R2, no network.
 */
import { describe, it, expect } from "vitest";
import { sniffImage } from "./imageSniff";

const bytes = (...values: number[]) => Buffer.from(values);

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const GIF = Buffer.from("GIF89a________", "ascii");
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  bytes(0x00, 0x00, 0x00, 0x00),
  Buffer.from("WEBP", "ascii"),
]);

describe("sniffImage — accepts the raster allowlist", () => {
  it.each([
    ["PNG", PNG, "image/png", "png"],
    ["JPEG", JPEG, "image/jpeg", "jpg"],
    ["GIF", GIF, "image/gif", "gif"],
    ["WebP", WEBP, "image/webp", "webp"],
  ])("classifies %s", (_name, buffer, kind, extension) => {
    const result = sniffImage(buffer as Buffer);
    expect(result?.kind).toBe(kind);
    expect(result?.extension).toBe(extension);
  });
});

describe("sniffImage — rejects everything else", () => {
  /**
   * The one that would actually hurt. An SVG served from our origin can carry
   * `<script>` and run with our privileges, which is why the allowlist is
   * raster-only and why this is asserted rather than assumed.
   */
  it("rejects SVG, however it is dressed up", () => {
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(sniffImage(Buffer.from('<?xml version="1.0"?><svg onload="alert(1)"/>'))).toBeNull();
    // Leading whitespace is a classic way past a naive "starts with <svg" check.
    expect(sniffImage(Buffer.from('\n\t  <svg/>'))).toBeNull();
  });

  it("rejects HTML", () => {
    expect(sniffImage(Buffer.from("<!doctype html><script>alert(1)</script>"))).toBeNull();
  });

  it("rejects a RIFF container that is not WebP", () => {
    // A WAV file opens with the same four bytes as a WebP; only the marker at
    // offset 8 tells them apart.
    const wav = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      bytes(0x00, 0x00, 0x00, 0x00),
      Buffer.from("WAVE", "ascii"),
    ]);
    expect(sniffImage(wav)).toBeNull();
  });

  it("rejects a file whose extension lies about its content", () => {
    // The service builds the stored key from what it sniffs, never from the
    // uploaded name — so a "screenshot.png" full of script bytes gets nowhere.
    expect(sniffImage(Buffer.from("#!/bin/sh\nrm -rf /"))).toBeNull();
  });

  it("rejects truncated and empty buffers rather than reading past the end", () => {
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
    // First two bytes of a PNG signature and nothing more.
    expect(sniffImage(bytes(0x89, 0x50))).toBeNull();
    // "RIFF" with no room for the format marker.
    expect(sniffImage(Buffer.from("RIFF", "ascii"))).toBeNull();
  });
});
