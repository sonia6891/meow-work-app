import { createSign } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const required = ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY', 'ASC_APP_ID'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required GitHub Actions secret/input: ${name}`);
}

const b64url = (value) => Buffer.from(value).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' }));
const payload = b64url(JSON.stringify({
  iss: process.env.ASC_ISSUER_ID,
  iat: now,
  exp: now + 900,
  aud: 'appstoreconnect-v1',
}));
const unsigned = `${header}.${payload}`;
const signer = createSign('SHA256');
signer.update(unsigned);
signer.end();
const signature = signer.sign({ key: process.env.ASC_PRIVATE_KEY.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363' }).toString('base64url');
const token = `${unsigned}.${signature}`;
const root = 'https://api.appstoreconnect.apple.com/v1';
const appId = encodeURIComponent(process.env.ASC_APP_ID);

async function get(path) {
  const response = await fetch(`${root}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`App Store Connect GET ${path} failed (${response.status}): ${body.slice(0, 1000)}`);
  }
  return response.json();
}

const [app, versions, builds, submissions] = await Promise.all([
  get(`/apps/${appId}`),
  get(`/apps/${appId}/appStoreVersions?filter%5Bplatform%5D=IOS&sort=-createdDate&limit=10`),
  get(`/builds?filter%5Bapp%5D=${appId}&sort=-uploadedDate&limit=10`),
  get(`/apps/${appId}/reviewSubmissions?sort=-submittedDate&limit=10`),
]);

const submissionsWithVersions = await Promise.all((submissions.data ?? []).map(async (item) => {
  const links = await get(`/reviewSubmissions/${encodeURIComponent(item.id)}/items?limit=10`);
  return { ...item, items: links.data ?? [] };
}));

const betaBuildStatuses = await Promise.all((builds.data ?? []).map(async (build) => {
  const beta = await get(`/builds/${encodeURIComponent(build.id)}/buildBetaDetail`);
  return {
    id: build.id,
    buildNumber: build.attributes?.version ?? null,
    marketingVersion: build.attributes?.preReleaseVersion ?? null,
    uploadedDate: build.attributes?.uploadedDate ?? null,
    processingState: build.attributes?.processingState ?? null,
    internalBetaState: beta.data?.attributes?.internalBuildState ?? null,
    externalBetaState: beta.data?.attributes?.externalBuildState ?? null,
    expired: build.attributes?.expired ?? null,
  };
}));

const result = {
  queriedAt: new Date().toISOString(),
  app: { id: app.data.id, name: app.data.attributes?.name, bundleId: app.data.attributes?.bundleId },
  appStoreVersions: (versions.data ?? []).map(item => ({
    id: item.id,
    versionString: item.attributes?.versionString,
    platform: item.attributes?.platform,
    appVersionState: item.attributes?.appVersionState ?? item.attributes?.appStoreState,
    releaseType: item.attributes?.releaseType,
    createdDate: item.attributes?.createdDate,
  })),
  builds: betaBuildStatuses,
  reviewSubmissions: submissionsWithVersions.map(item => ({
    id: item.id,
    state: item.attributes?.state,
    submittedDate: item.attributes?.submittedDate,
    items: item.items.map(row => ({ id: row.id, state: row.attributes?.state, itemType: row.attributes?.itemType })),
  })),
};

await writeFile('app-store-status.json', `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
const output = JSON.stringify(result);
process.stdout.write(`status_json=${output.replaceAll('%', '%25').replaceAll('\n', '%0A').replaceAll('\r', '%0D')}\n`);
