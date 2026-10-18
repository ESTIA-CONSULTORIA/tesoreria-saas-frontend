// Regenera src/core/theme/skins.generated.css desde skins.ts (Node 22.18+/24 ejecuta TypeScript directo).
import { writeFileSync } from 'node:fs';
import { cssSkins } from '../src/core/theme/skins.ts';

writeFileSync(new URL('../src/core/theme/skins.generated.css', import.meta.url), cssSkins());
console.log('skins.generated.css actualizado');
