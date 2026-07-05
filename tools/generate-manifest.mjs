// AdFlow manifest ジェネレータ（依存なし・Node 標準のみ）。
//
// ads/<id>/ad.json を走査して manifest.json を再生成する。
//  - creative.image を「content ベース URL からの相対パス」ads/<id>/<file> へ正規化。
//  - slots は既存 manifest.json の slots を尊重し、無ければ全 enabled 広告を
//    winray-panel-top(single) に割り当てた既定スロットを生成する。
//  - generatedAt を更新する（これ以外は冪等）。
//
// 使い方: node tools/generate-manifest.mjs [--check]
//   --check: 生成結果を書き込まず、generatedAt を除いて既存と差分があれば exit 1。

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADS_DIR = join(ROOT, 'ads');
const MANIFEST_PATH = join(ROOT, 'manifest.json');
const DEFAULT_SLOT = 'winray-panel-top';

/** ads 配下の各 <id>/ad.json を読み込み [id, ad] の配列で返す（id はディレクトリ名を正とする）。 */
function loadAds() {
  if (!existsSync(ADS_DIR)) return [];
  const out = [];
  for (const entry of readdirSync(ADS_DIR)) {
    const dir = join(ADS_DIR, entry);
    if (!statSync(dir).isDirectory()) continue;
    const adPath = join(dir, 'ad.json');
    if (!existsSync(adPath)) continue;
    const ad = JSON.parse(readFileSync(adPath, 'utf8'));
    ad.id = entry; // ディレクトリ名を id の正とする
    // creative.image を ads/<id>/<file> へ正規化（既に接頭済みなら維持）。
    if (ad.creative && typeof ad.creative.image === 'string' && ad.creative.image.length > 0) {
      const img = ad.creative.image;
      ad.creative.image = img.startsWith('ads/') ? img : `ads/${entry}/${basename(img)}`;
    }
    out.push([entry, ad]);
  }
  out.sort((a, b) => a[0].localeCompare(b[0])); // 決定的な順序
  return out;
}

/** 既存 manifest の slots を読む（無ければ null）。 */
function readExistingSlots() {
  if (!existsSync(MANIFEST_PATH)) return null;
  try {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    return m && typeof m.slots === 'object' ? m.slots : null;
  } catch {
    return null;
  }
}

function build() {
  const ads = loadAds();
  const adsMap = {};
  for (const [id, ad] of ads) adsMap[id] = ad;

  let slots = readExistingSlots();
  if (!slots || Object.keys(slots).length === 0) {
    const enabledIds = ads.filter(([, a]) => a.enabled !== false).map(([id]) => id);
    slots = { [DEFAULT_SLOT]: { strategy: 'single', adIds: enabledIds } };
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    slots,
    ads: adsMap,
  };
}

/** generatedAt を除いた安定表現（差分比較用）。 */
function stable(m) {
  const { generatedAt, ...rest } = m;
  return JSON.stringify(rest);
}

const manifest = build();
const json = JSON.stringify(manifest, null, 2) + '\n';

if (process.argv.includes('--check')) {
  if (!existsSync(MANIFEST_PATH)) {
    console.error('manifest.json が存在しません。node tools/generate-manifest.mjs を実行してください。');
    process.exit(1);
  }
  const current = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  if (stable(current) !== stable(manifest)) {
    console.error('manifest.json が ads/ と一致していません（generatedAt を除く差分あり）。再生成してください。');
    process.exit(1);
  }
  console.log('manifest.json は最新です。');
} else {
  writeFileSync(MANIFEST_PATH, json);
  console.log(`manifest.json を再生成しました（広告 ${Object.keys(manifest.ads).length} 件）。`);
}
