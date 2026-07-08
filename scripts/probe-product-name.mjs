#!/usr/bin/env node
/**
 * Diagnóstico: resolve nome real via NA getstock → EAN → GTINHub/UPC/EPREL.
 *
 * Uso:
 *   npm run probe:product-name -- --ref=10833
 *   npm run probe:product-name -- --ean=5420068609772
 */
import { loadEnvFiles } from './lib/load-env.mjs';
import { resolveProductName } from './lib/resolve-product-name.mjs';

loadEnvFiles();

function parseArg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function main() {
  const ref = parseArg('ref');
  const ean = parseArg('ean');

  if (!ref && !ean) {
    console.error('Informe --ref= ou --ean=');
    process.exit(1);
  }

  console.log('=== Resolver nome de produto ===\n');
  const result = await resolveProductName({ naRef: ref, ean, useCache: false });

  if (result.naArticle) {
    console.log('NA getstock:');
    console.log(
      JSON.stringify(
        {
          'product-id': result.naArticle['product-id'],
          ean: result.naArticle.ean,
          price: result.naArticle.price,
          amount: result.naArticle.amount,
        },
        null,
        2
      )
    );
    console.log('');
  }

  console.log(`EAN usado: ${result.ean || '(nenhum)'} (${result.eanSource || '-'})`);

  if (result.merged) {
    console.log('\nNome real encontrado:');
    console.log(JSON.stringify(result.merged, null, 2));
  } else {
    console.log('\nNão encontrado:', result.reason);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
