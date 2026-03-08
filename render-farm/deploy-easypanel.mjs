import { fetchJson, sleep } from './common.mjs';

const parseBoolean = (value, fallback) => {
  if (value == null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
};

const parseArgs = (argv) => {
  const options = {
    apiKey: process.env.EASYPANEL_API_KEY ?? '',
    certificateResolver: process.env.EASYPANEL_CERTIFICATE_RESOLVER ?? 'letsencrypt',
    createService: parseBoolean(process.env.RENDER_FARM_CREATE_SERVICE, false),
    deploy: true,
    dockerfile: process.env.RENDER_FARM_DOCKERFILE ?? './Dockerfile.render-farm-worker',
    dockerfileInline: process.env.RENDER_FARM_DOCKERFILE_INLINE ?? '',
    domainHost: process.env.RENDER_FARM_DOMAIN_HOST ?? '',
    domainPath: process.env.RENDER_FARM_DOMAIN_PATH ?? '/',
    gitRepoUrl: process.env.RENDER_FARM_GIT_REPO_URL ?? '',
    githubOwner: process.env.GITHUB_REPO_OWNER ?? 'Folkz1',
    githubPath: process.env.GITHUB_REPO_PATH ?? '/',
    githubRef: process.env.GITHUB_REPO_REF ?? 'master',
    githubRepo: process.env.GITHUB_REPO_NAME ?? 'video-render',
    healthTimeoutMs: Number(process.env.RENDER_FARM_HEALTH_TIMEOUT_MS ?? 20 * 60_000),
    healthUrl: process.env.RENDER_FARM_HEALTH_URL ?? '',
    https: parseBoolean(process.env.RENDER_FARM_DOMAIN_HTTPS, true),
    image: process.env.RENDER_FARM_IMAGE ?? '',
    imagePassword: process.env.RENDER_FARM_IMAGE_PASSWORD ?? '',
    imageUsername: process.env.RENDER_FARM_IMAGE_USERNAME ?? '',
    internalPath: process.env.RENDER_FARM_INTERNAL_PATH ?? '/',
    internalPort: Number(process.env.RENDER_FARM_INTERNAL_PORT ?? 3001),
    panelUrl: process.env.EASYPANEL_URL ?? '',
    pollIntervalMs: Number(process.env.RENDER_FARM_POLL_INTERVAL_MS ?? 10_000),
    project: process.env.EASYPANEL_PROJECT ?? '',
    service: process.env.EASYPANEL_SERVICE ?? 'render',
    source: process.env.RENDER_FARM_SOURCE ?? 'github',
    wildcard: parseBoolean(process.env.RENDER_FARM_DOMAIN_WILDCARD, false),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--panel-url') {
      options.panelUrl = next;
      index += 1;
      continue;
    }

    if (token === '--project') {
      options.project = next;
      index += 1;
      continue;
    }

    if (token === '--service') {
      options.service = next;
      index += 1;
      continue;
    }

    if (token === '--api-key') {
      options.apiKey = next;
      index += 1;
      continue;
    }

    if (token === '--source') {
      options.source = next;
      index += 1;
      continue;
    }

    if (token === '--create-service') {
      options.createService = true;
      continue;
    }

    if (token === '--github-owner') {
      options.githubOwner = next;
      index += 1;
      continue;
    }

    if (token === '--github-repo') {
      options.githubRepo = next;
      index += 1;
      continue;
    }

    if (token === '--github-ref') {
      options.githubRef = next;
      index += 1;
      continue;
    }

    if (token === '--github-path') {
      options.githubPath = next;
      index += 1;
      continue;
    }

    if (token === '--dockerfile') {
      options.dockerfile = next;
      index += 1;
      continue;
    }

    if (token === '--dockerfile-inline') {
      options.dockerfileInline = next;
      index += 1;
      continue;
    }

    if (token === '--image') {
      options.image = next;
      index += 1;
      continue;
    }

    if (token === '--image-username') {
      options.imageUsername = next;
      index += 1;
      continue;
    }

    if (token === '--image-password') {
      options.imagePassword = next;
      index += 1;
      continue;
    }

    if (token === '--git-repo-url') {
      options.gitRepoUrl = next;
      index += 1;
      continue;
    }

    if (token === '--domain-host') {
      options.domainHost = next;
      index += 1;
      continue;
    }

    if (token === '--domain-path') {
      options.domainPath = next;
      index += 1;
      continue;
    }

    if (token === '--certificate-resolver') {
      options.certificateResolver = next;
      index += 1;
      continue;
    }

    if (token === '--internal-port') {
      options.internalPort = Number(next);
      index += 1;
      continue;
    }

    if (token === '--internal-path') {
      options.internalPath = next;
      index += 1;
      continue;
    }

    if (token === '--health-url') {
      options.healthUrl = next;
      index += 1;
      continue;
    }

    if (token === '--health-timeout-ms') {
      options.healthTimeoutMs = Number(next);
      index += 1;
      continue;
    }

    if (token === '--poll-interval-ms') {
      options.pollIntervalMs = Number(next);
      index += 1;
      continue;
    }

    if (token === '--https') {
      options.https = parseBoolean(next, options.https);
      index += 1;
      continue;
    }

    if (token === '--wildcard') {
      options.wildcard = parseBoolean(next, options.wildcard);
      index += 1;
      continue;
    }

    if (token === '--skip-deploy') {
      options.deploy = false;
      continue;
    }
  }

  return options;
};

const trpcInput = (payload) =>
  encodeURIComponent(JSON.stringify({ json: payload }));

const trpcRequest = async (
  panelUrl,
  apiKey,
  procedure,
  payload,
  { method = 'GET', timeoutMs = 30_000 } = {},
) => {
  const urlBase = panelUrl.replace(/\/$/, '');
  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };

  if (method === 'GET') {
    return fetchJson(`${urlBase}/api/trpc/${procedure}?input=${trpcInput(payload)}`, {
      headers,
      method,
      timeoutMs,
    });
  }

  return fetchJson(`${urlBase}/api/trpc/${procedure}`, {
    body: JSON.stringify({ json: payload }),
    headers: {
      ...headers,
      'content-type': 'application/json',
    },
    method,
    timeoutMs,
  });
};

const inspectService = async (options) => {
  const response = await trpcRequest(
    options.panelUrl,
    options.apiKey,
    'services.app.inspectService',
    {
      projectName: options.project,
      serviceName: options.service,
    },
  );

  return response.result?.data?.json ?? response;
};

const createService = async (options) =>
  trpcRequest(
    options.panelUrl,
    options.apiKey,
    'services.app.createService',
    {
      projectName: options.project,
      serviceName: options.service,
    },
    {
      method: 'POST',
      timeoutMs: 60_000,
    },
  );

const listDomains = async (options) => {
  const response = await trpcRequest(
    options.panelUrl,
    options.apiKey,
    'domains.listDomains',
    {
      projectName: options.project,
      serviceName: options.service,
    },
  );

  return response.result?.data?.json ?? [];
};

const updateGithubSource = async (options) => {
  await trpcRequest(
    options.panelUrl,
    options.apiKey,
    'services.app.updateSourceGithub',
    {
      owner: options.githubOwner,
      path: options.githubPath,
      projectName: options.project,
      ref: options.githubRef,
      repo: options.githubRepo,
      serviceName: options.service,
    },
    {
      method: 'POST',
      timeoutMs: 60_000,
    },
  );

  await trpcRequest(
    options.panelUrl,
    options.apiKey,
    'services.app.updateSourceDockerfile',
    {
      dockerfile: options.dockerfile,
      projectName: options.project,
      serviceName: options.service,
    },
    {
      method: 'POST',
      timeoutMs: 60_000,
    },
  );
};

const remoteGitDockerfile = (options) => {
  const repoUrl = options.gitRepoUrl || `https://github.com/${options.githubOwner}/${options.githubRepo}.git`;
  const cacheBust = Date.now();

  return `FROM node:22-slim

RUN apt-get update && apt-get install -y \\
    git \\
    chromium \\
    ffmpeg \\
    fonts-noto-cjk \\
    fonts-freefont-ttf \\
    libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 \\
    libxrandr2 libxrender1 libxtst6 libnss3 libatk1.0-0 \\
    libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 libpango-1.0-0 \\
    libcairo2 libasound2 libxshmfence1 \\
    python3 curl \\
    && rm -rf /var/lib/apt/lists/*

ARG CACHE_BUST=${cacheBust}
RUN echo "$CACHE_BUST" && git clone --depth 1 --branch ${options.githubRef} ${repoUrl} /app

WORKDIR /app

RUN npm install --production=false

ENV PORT=${options.internalPort}
ENV WORKER_DATA_DIR=/data

EXPOSE ${options.internalPort}

CMD ["node", "render-farm/worker.mjs"]`;
};

const updateInlineDockerfileSource = async (options) =>
  trpcRequest(
    options.panelUrl,
    options.apiKey,
    'services.app.updateSourceDockerfile',
    {
      dockerfile: options.dockerfileInline || remoteGitDockerfile(options),
      projectName: options.project,
      serviceName: options.service,
    },
    {
      method: 'POST',
      timeoutMs: 60_000,
    },
  );

const updateImageSource = async (options) => {
  const payload = {
    image: options.image,
    projectName: options.project,
    serviceName: options.service,
  };

  if (options.imageUsername) {
    payload.username = options.imageUsername;
  }

  if (options.imagePassword) {
    payload.password = options.imagePassword;
  }

  await trpcRequest(
    options.panelUrl,
    options.apiKey,
    'services.app.updateSourceImage',
    payload,
    {
      method: 'POST',
      timeoutMs: 60_000,
    },
  );
};

const ensureDomain = async (options) => {
  if (!options.domainHost) {
    return null;
  }

  const domains = await listDomains(options);
  const existing = domains.find(
    (domain) => domain.host === options.domainHost && domain.path === options.domainPath,
  );

  if (existing) {
    return existing;
  }

  const response = await trpcRequest(
    options.panelUrl,
    options.apiKey,
    'domains.createDomain',
    {
      certificateResolver: options.certificateResolver,
      destinationType: 'service',
      host: options.domainHost,
      https: options.https,
      id: '',
      middlewares: [],
      path: options.domainPath,
      serviceDestination: {
        path: options.internalPath,
        port: options.internalPort,
        projectName: options.project,
        protocol: 'http',
        serviceName: options.service,
      },
      wildcard: options.wildcard,
    },
    {
      method: 'POST',
      timeoutMs: 60_000,
    },
  );

  return response.result?.data?.json ?? response;
};

const deployService = async (options) =>
  trpcRequest(
    options.panelUrl,
    options.apiKey,
    'services.app.deployService',
    {
      projectName: options.project,
      serviceName: options.service,
    },
    {
      method: 'POST',
      timeoutMs: 120_000,
    },
  );

const resolveHealthUrl = (options) => {
  if (options.healthUrl) {
    return options.healthUrl;
  }

  if (!options.domainHost) {
    return null;
  }

  const protocol = options.https ? 'https' : 'http';
  return `${protocol}://${options.domainHost.replace(/^https?:\/\//, '')}/health`;
};

const waitForHealth = async (healthUrl, timeoutMs, pollIntervalMs) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchJson(healthUrl, {
        timeoutMs: Math.min(10_000, pollIntervalMs),
      });

      return response;
    } catch {
      await sleep(pollIntervalMs);
    }
  }

  throw new Error(`Health check did not pass within ${timeoutMs}ms: ${healthUrl}`);
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (!options.panelUrl || !options.project || !options.service || !options.apiKey) {
    throw new Error('Use EASYPANEL_URL, EASYPANEL_PROJECT, EASYPANEL_SERVICE and EASYPANEL_API_KEY or pass them as flags');
  }

  if (options.createService) {
    try {
      await createService(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('Service already exists.')) {
        throw error;
      }
    }
  }

  if (options.source === 'github') {
    await updateGithubSource(options);
  } else if (options.source === 'dockerfile-inline') {
    await updateInlineDockerfileSource(options);
  } else if (options.source === 'image') {
    if (!options.image) {
      throw new Error('--image is required when --source image');
    }

    await updateImageSource(options);
  } else {
    throw new Error(`Unsupported source: ${options.source}`);
  }

  const domain = await ensureDomain(options);

  if (options.deploy) {
    await deployService(options);
  }

  const service = await inspectService(options);
  const healthUrl = resolveHealthUrl(options);
  let health = null;

  if (healthUrl) {
    health = await waitForHealth(healthUrl, options.healthTimeoutMs, options.pollIntervalMs);
  }

  console.log(JSON.stringify({
    domainHost: domain?.host ?? options.domainHost ?? null,
    health,
    healthUrl,
    panelUrl: options.panelUrl,
    project: options.project,
    service: options.service,
    source: service.source ?? null,
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
