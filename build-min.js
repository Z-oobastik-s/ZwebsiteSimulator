/**
 * Minify all scripts/*.js → assets/js/*.min.js
 * Run: node build-min.js
 */
const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'scripts');
const OUT_DIR = path.join(__dirname, 'assets', 'js');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.js'));

async function run() {
    let totalOrig = 0, totalMin = 0;
    console.log('Minifying scripts...\n');

    for (const file of files) {
        const src = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
        const outFile = file.replace('.js', '.min.js');
        const outPath = path.join(OUT_DIR, outFile);

        try {
            const result = await minify(src, {
                compress: {
                    drop_console: false,    // keep console.error / console.warn
                    passes: 2
                },
                mangle: true,
                format: { comments: false }
            });

            fs.writeFileSync(outPath, result.code, 'utf8');

            const origKB = (src.length / 1024).toFixed(1);
            const minKB  = (result.code.length / 1024).toFixed(1);
            const saved  = Math.round((1 - result.code.length / src.length) * 100);
            totalOrig += src.length;
            totalMin  += result.code.length;
            console.log(`  ${file.padEnd(28)} ${origKB.padStart(7)} KB → ${minKB.padStart(6)} KB  (-${saved}%)`);
        } catch (err) {
            console.error(`  ERROR ${file}: ${err.message}`);
        }
    }

    const totalSaved = Math.round((1 - totalMin / totalOrig) * 100);
    console.log(`\n${'TOTAL'.padEnd(28)} ${(totalOrig/1024).toFixed(1).padStart(7)} KB → ${(totalMin/1024).toFixed(1).padStart(6)} KB  (-${totalSaved}%)`);
    console.log('\nMinified files saved to assets/js/');
}

run().catch(console.error);
