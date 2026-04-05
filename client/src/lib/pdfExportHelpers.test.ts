/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSvgDimensions, sanitizeSvgForExport } from "./pdfExport";

describe("getSvgDimensions", () => {
  it("extracts dimensions from viewBox attribute", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 800 600");
    const result = getSvgDimensions(svg);
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it("extracts dimensions from viewBox with comma separators", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0,0,1024,768");
    const result = getSvgDimensions(svg);
    expect(result).toEqual({ width: 1024, height: 768 });
  });

  it("extracts dimensions from viewBox with non-zero origin", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "10 20 500 300");
    const result = getSvgDimensions(svg);
    expect(result).toEqual({ width: 500, height: 300 });
  });

  it("falls back to width/height attributes when viewBox is missing", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "640");
    svg.setAttribute("height", "480");
    const result = getSvgDimensions(svg);
    expect(result).toEqual({ width: 640, height: 480 });
  });

  it("falls back to default dimensions when no attributes are present", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // jsdom getBoundingClientRect returns 0,0 by default
    const result = getSvgDimensions(svg);
    expect(result).toEqual({ width: 700, height: 400 });
  });

  it("ignores viewBox with zero dimensions", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 0 0");
    svg.setAttribute("width", "300");
    svg.setAttribute("height", "200");
    const result = getSvgDimensions(svg);
    expect(result).toEqual({ width: 300, height: 200 });
  });

  it("ignores invalid viewBox format", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "invalid");
    const result = getSvgDimensions(svg);
    // Falls through to defaults since width/height attrs are also missing
    expect(result).toEqual({ width: 700, height: 400 });
  });
});

describe("sanitizeSvgForExport", () => {
  it("sets width, height, and xmlns attributes", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.innerHTML = '<rect x="0" y="0" width="100" height="100" />';
    const result = sanitizeSvgForExport(svg, 800, 600);
    expect(result.getAttribute("width")).toBe("800");
    expect(result.getAttribute("height")).toBe("600");
    expect(result.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
    expect(result.getAttribute("xmlns:xlink")).toBe("http://www.w3.org/1999/xlink");
  });

  it("removes external image references", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("href", "https://external.com/image.png");
    svg.appendChild(img);
    const result = sanitizeSvgForExport(svg, 100, 100);
    expect(result.querySelectorAll("image").length).toBe(0);
  });

  it("preserves data URI image references", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("href", "data:image/png;base64,abc123");
    svg.appendChild(img);
    const result = sanitizeSvgForExport(svg, 100, 100);
    expect(result.querySelectorAll("image").length).toBe(1);
  });

  it("does not modify the original SVG element", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "50");
    const result = sanitizeSvgForExport(svg, 800, 600);
    expect(svg.getAttribute("width")).toBe("50");
    expect(result.getAttribute("width")).toBe("800");
  });

  it("preserves child elements", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    svg.appendChild(rect);
    svg.appendChild(circle);
    const result = sanitizeSvgForExport(svg, 100, 100);
    expect(result.querySelectorAll("rect").length).toBe(1);
    expect(result.querySelectorAll("circle").length).toBe(1);
  });
});
