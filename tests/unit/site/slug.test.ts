import { expect, test } from "bun:test";
import { slugOf, uniqueSlugsOf } from "../../../src/site/slug.ts";

test("a heading's id drops punctuation the way GitHub's anchors do, not keeping colons and commas", () => {
  expect(slugOf("Checks: gate, которые ловят то, что агент пропускает")).toBe("checks-gate-которые-ловят-то-что-агент-пропускает");
  expect(slugOf("Подход к работе с кодовыми агентами: обзор тезисов")).toBe("подход-к-работе-с-кодовыми-агентами-обзор-тезисов");
  expect(slugOf("Выбор модели и reasoning effort")).toBe("выбор-модели-и-reasoning-effort");
});

test("a heading keeps hyphens and underscores and turns each space into a hyphen, not collapsing them", () => {
  expect(slugOf("a - b_c  d")).toBe("a---b_c--d");
});

test("a repeated heading gets a numbered id, not the id of the first one", () => {
  expect(uniqueSlugsOf(["Ресурсы", "Ресурсы", "Ресурсы-1", "Ресурсы"])).toEqual(["ресурсы", "ресурсы-1", "ресурсы-1-1", "ресурсы-2"]);
});
