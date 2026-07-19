// wasmEngine.ts — the only file that touches the compiled WASM module.
// Solo mode only: the DP table ships pre-solved (baked in at build time via
// --preload-file), so there's never a client-side solve — every query is an
// instant table lookup. isEngineWarm() is therefore always true, and there
// is no solve progress to report (onProgress is accepted for interface
// parity with sidecar.ts but never invoked).
import type { GameState } from "./state";
import { parseQueryResult, type QueryResult } from "./parseResult";

interface YatzyModule {
  queryJson(usedMask: number, upperTotal: number, diceCsv: string, rerollsLeft: number): string;
}

let modulePromise: Promise<YatzyModule> | null = null;

function loadModule(): Promise<YatzyModule> {
  if (!modulePromise) {
    // The Emscripten-generated loader resolves the .wasm binary via
    // `new URL("yatzy_engine.wasm", import.meta.url)` (correctly anchored to
    // this module's own location), but fetches the --preload-file .data
    // package via a bare relative `fetch("yatzy_engine.data")` (anchored to
    // the *page's* URL instead). Passing `locateFile` overrides asset
    // resolution for both, anchoring every requested filename to this
    // file's own directory (one level up from wasm/) so it works regardless
    // of which page loads it.
    modulePromise = import("./wasm/yatzy_engine.js").then((mod) =>
      mod.default({
        locateFile: (path: string) => new URL(`./wasm/${path}`, import.meta.url).href,
      })
    );
  }
  return modulePromise;
}

export async function isEngineWarm(): Promise<boolean> {
  return true;
}

export async function getRecommendation(
  state: GameState,
  dice: number[],
  _onProgress?: (level: number, total: number) => void
): Promise<QueryResult> {
  const mod = await loadModule();
  const json = mod.queryJson(state.usedMask, state.upperTotal, dice.join(","), state.rerollsLeft);
  return parseQueryResult(json);
}
