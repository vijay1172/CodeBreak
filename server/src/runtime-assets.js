import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const archiveName = 'mongodb-linux-x86_64-debian12-8.2.6';
const archiveURL = 'https://fastdl.mongodb.org/linux/' + archiveName + '.tgz';
// Published at the same official URL with the .sha256 suffix.
const archiveSHA256 = 'ebf8bd8eb59c746a1ec834db4fe84d853453ed67ae3c39aea379dd0bbd16a2e6';
export const sandboxMongoPath = '/tmp/brokenrepo-mongod-8.2.6';
let pending;

async function hashFile(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}
async function prepareMongoBinary() {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'brokenrepo-mongo-'));
  const archive = path.join(directory, 'mongodb.tgz');
  try {
    const response = await fetch(archiveURL, { signal: AbortSignal.timeout(180000) });
    if (!response.ok || !response.body) throw new Error('MongoDB dependency download failed with HTTP ' + response.status);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(archive, { flags: 'wx' }));
    if (await hashFile(archive) !== archiveSHA256) throw new Error('MongoDB dependency checksum did not match the pinned official archive.');
    return { archive, sha256: archiveSHA256 };
  } catch (error) {
    // Only this invocation's freshly created temporary directory is removed.
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  }
}
export async function installSandboxMongo(sandbox) {
  if (!pending) pending = prepareMongoBinary().catch(error => { pending = undefined; throw error; });
  const artifact = await pending;
  const remoteArchive = '/tmp/brokenrepo-mongodb-8.2.6.tgz';
  // Transfer the compressed archive, not the much larger executable.
  await sandbox.fs.uploadFileStream(artifact.archive, remoteArchive, { timeout: 180 });
  const check = await sandbox.process.executeCommand('sha256sum ' + remoteArchive, undefined, undefined, 30);
  if (check.exitCode !== 0 || check.result.trim().split(/\s+/)[0] !== artifact.sha256) {
    throw new Error('The sandbox MongoDB archive failed its upload-integrity check.');
  }
  const extract = await sandbox.process.executeCommand(
    'mkdir -p /tmp/brokenrepo-mongo-runtime && tar -xzf ' + remoteArchive +
    ' --strip-components=2 -C /tmp/brokenrepo-mongo-runtime ' + archiveName + '/bin/mongod' +
    ' && mv /tmp/brokenrepo-mongo-runtime/mongod ' + sandboxMongoPath +
    ' && chmod 755 ' + sandboxMongoPath + ' && rm -f ' + remoteArchive,
    undefined, undefined, 60,
  );
  if (extract.exitCode !== 0) throw new Error('The verified MongoDB runtime could not be unpacked inside the sandbox.');
}
