"use strict";
// Minimal .beonx packer; metadata follows the Beon Code Extension API 1.0 format.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function buildBundle(privateKeyPem) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extension.json'), 'utf8'));
  if (manifest.kind !== 'language-pack' || manifest.apiVersion !== '1.0' || manifest.main ||
      manifest.activationEvents?.length || manifest.capabilities?.length) {
    throw new Error('This release supports declarative language packs only.');
  }
  if (!/^[a-z0-9][a-z0-9.-]{1,99}$/.test(manifest.publisher || '') ||
      manifest.id !== `${manifest.publisher}.language-pack-pt-br` ||
      !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(manifest.version || '')) {
    throw new Error('Invalid publisher, extension id, or semantic version.');
  }
  const files = ['extension.json', 'translations/main.i18n.json'].map(file => {
    const content = fs.readFileSync(path.join(root, file));
    if (content.length > 8 * 1024 * 1024) throw new Error(`File too large: ${file}`);
    return { path:file, size:content.length, sha256:sha256(content), content:content.toString('base64') };
  });
  const metadata = { format:'beonx', formatVersion:1, manifest,
    files:files.map(({path,size,sha256}) => ({path,size,sha256})) };
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('An Ed25519 key is required.');
  const publicKey = crypto.createPublicKey(privateKey).export({type:'spki',format:'pem'});
  const bundle = {...metadata, files, signature:{
    algorithm:'ed25519', keyId:'publisher-primary', publicKey,
    value:crypto.sign(null,Buffer.from(canonical(metadata)),privateKey).toString('base64')
  }};
  return bundle;
}
function verifyBundle(bundle) {
  const signature = bundle.signature;
  const metadata = {format:bundle.format,formatVersion:bundle.formatVersion,manifest:bundle.manifest,
    files:bundle.files.map(({path,size,sha256})=>({path,size,sha256}))};
  if (bundle.format !== 'beonx' || bundle.formatVersion !== 1 || signature?.algorithm !== 'ed25519') return false;
  if (!bundle.files.every(file => {
    const bytes = Buffer.from(file.content, 'base64');
    return bytes.toString('base64') === file.content && bytes.length === file.size && sha256(bytes) === file.sha256;
  })) return false;
  return crypto.verify(null,Buffer.from(canonical(metadata)),signature.publicKey,Buffer.from(signature.value,'base64'));
}
if (require.main === module) {
  try {
    const keyFile = process.argv[2];
    if (!keyFile) throw new Error('Usage: npm run pack -- /path/to/private.pem [output-directory]');
    const key = fs.readFileSync(path.resolve(keyFile),'utf8');
    const bundle = buildBundle(key);
    if (!verifyBundle(bundle)) throw new Error('Package verification failed.');
    const out = path.resolve(process.argv[3] || path.join(root,'dist'));
    fs.mkdirSync(out,{recursive:true});
    const filename = `${bundle.manifest.id}-${bundle.manifest.version}.beonx`;
    const destination = path.join(out,filename);
    fs.writeFileSync(destination,`${JSON.stringify(bundle)}\n`,{mode:0o600});
    fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),`${sha256(fs.readFileSync(destination))}  ${filename}\n`);
    process.stdout.write(`Created ${destination}\n`);
  } catch (error) {console.error(error.message);process.exitCode=1;}
}
module.exports = {buildBundle,verifyBundle};
