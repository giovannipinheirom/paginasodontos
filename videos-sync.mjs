// Atualiza js/videos-list.js, js/videos-manifest.js e videos/manifest.json a partir da pasta de vídeos.
// VIDEOS_GERADOS lista as clínicas com qualquer vídeo; VIDEOS_RAIOX, as que já têm <id>-raiox.mp4.
import fs from 'node:fs';
import path from 'node:path';

export function syncVideosList(outDir = './videos') {
  try {
    const files = fs.readdirSync(outDir).filter(f => f.endsWith('.mp4'));
    const raiox = files.filter(f => f.endsWith('-raiox.mp4')).map(f => f.replace(/-raiox\.mp4$/, '')).sort();
    const ids = [...new Set(files
      .filter(f => !f.endsWith('-raiox-vertical.mp4'))
      .map(f => f.replace(/(-raiox)?\.mp4$/, '')))].sort();

    const listFile = path.resolve('./js/videos-list.js');
    if (fs.existsSync(path.dirname(listFile))) {
      fs.writeFileSync(listFile, `// Gerado automaticamente pelo gerador de vídeos
// Total de clínicas com vídeo: ${ids.length} (Raio-x: ${raiox.length})
// Atualizado em: ${new Date().toLocaleString('pt-BR')}
window.VIDEOS_GERADOS = ${JSON.stringify(ids, null, 2)};
window.VIDEOS_RAIOX = ${JSON.stringify(raiox, null, 2)};
`, 'utf8');
    }

    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(ids, null, 2), 'utf8');

    const compatFile = path.resolve('./js/videos-manifest.js');
    if (fs.existsSync(path.dirname(compatFile))) {
      fs.writeFileSync(compatFile, `// Gerado automaticamente pelo gerador de vídeos
window.VIDEOS_GERADOS = ${JSON.stringify(ids, null, 2)};
window.VIDEOS_RAIOX = ${JSON.stringify(raiox, null, 2)};
`, 'utf8');
    }
  } catch (err) {
    // Silencia erros de I/O em background
  }
}

if (process.argv[1] && (process.argv[1].endsWith('videos-sync.mjs') || process.argv[1].endsWith('videos-sync'))) {
  syncVideosList();
  console.log('✔ Lista de vídeos sincronizada');
}

