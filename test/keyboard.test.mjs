import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

test("the search shortcut handles one web installation and releases its listener", async (t) => {
  const built = await build({
    entryPoints: ["client/keyboard.ts"],
    bundle: true,
    write: false,
    format: "cjs",
    external: ["react", "react-native"],
  });
  const platform = { OS: "web" };
  const module = { exports: {} };
  new Function("require", "module", "exports", built.outputFiles[0].text)(
    () => ({ Platform: platform }), module, module.exports,
  );
  const { registerSearchShortcut } = module.exports;

  const document = new EventTarget();
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  t.after(() => Reflect.deleteProperty(globalThis, "document"));
  const press = (overrides = {}) => {
    const event = Object.assign(new Event("keydown", { cancelable: true }), {
      key: "Y", metaKey: true, ctrlKey: false, shiftKey: true,
      altKey: false, repeat: false, isComposing: false, ...overrides,
    });
    return document.dispatchEvent(event);
  };

  const opened = [];
  const removeFirst = registerSearchShortcut(() => opened.push("first"));
  const removeSecond = registerSearchShortcut(() => opened.push("second"));
  assert.equal(press({ shiftKey: false }), true);
  assert.equal(press({ altKey: true }), true);
  assert.equal(press({ ctrlKey: true }), true);
  assert.equal(press({ isComposing: true }), true);
  assert.equal(press({ repeat: true }), false);
  assert.deepEqual(opened, []);

  assert.equal(press(), false);
  removeFirst();
  assert.equal(press({ metaKey: false, ctrlKey: true }), false);
  removeSecond();
  assert.equal(press(), true);
  assert.deepEqual(opened, ["first", "second"]);

  platform.OS = "ios";
  assert.equal(registerSearchShortcut(() => assert.fail("native listener ran")), undefined);
});
