import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../mocks/server";

// happy-dom の Animation はコンストラクタで finished promise を必ず作り、cancel() で
// AbortError として reject する (happy-dom/lib/animation/Animation.js)。motion は
// NativeAnimation.cancel() で throw だけを try/catch していてこの拒否を受け取らないため、
// AnimatePresence の退場などでアニメーションが中断されると未処理拒否になる。
// vitest 5 は未処理拒否を実行全体の失敗として扱うので、テスト環境でだけ catch を付ける。
// (アプリのコードと本番の挙動は変更しない)
const nativeAnimate = Element.prototype.animate;
if (nativeAnimate) {
  Element.prototype.animate = function (
    this: Element,
    ...args: Parameters<typeof nativeAnimate>
  ) {
    const animation = nativeAnimate.apply(this, args);
    animation.finished?.catch(() => {});
    return animation;
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
