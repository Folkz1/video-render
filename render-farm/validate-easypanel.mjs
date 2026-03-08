import { fetchJson } from './common.mjs';

const parseArgs = (argv) => {
  const options = {
    apiKey: process.env.EASYPANEL_API_KEY ?? '',
    panelUrl: process.env.EASYPANEL_URL ?? '',
    project: process.env.EASYPANEL_PROJECT ?? '',
    service: process.env.EASYPANEL_SERVICE ?? 'render',
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
    }
  }

  return options;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (!options.panelUrl || !options.project || !options.service || !options.apiKey) {
    throw new Error('Use EASYPANEL_URL, EASYPANEL_PROJECT, EASYPANEL_SERVICE and EASYPANEL_API_KEY or pass them as flags');
  }

  const input = encodeURIComponent(
    JSON.stringify({
      json: {
        projectName: options.project,
        serviceName: options.service,
      },
    }),
  );

  const response = await fetchJson(
    `${options.panelUrl}/api/trpc/services.app.inspectService?input=${input}`,
    {
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
      },
      timeoutMs: 15_000,
    },
  );

  const service = response.result?.data?.json ?? response;
  const findings = [];

  if (!service.source?.image && !service.source?.repo && !service.source?.type) {
    findings.push('missing source/image');
  }

  if (!service.primaryDomainId && (!Array.isArray(service.ports) || service.ports.length === 0)) {
    findings.push('missing ingress (no primaryDomainId and no ports)');
  }

  if (!service.deploymentUrl) {
    findings.push('missing deploymentUrl');
  }

  console.log(JSON.stringify({
    deploymentUrl: service.deploymentUrl ?? null,
    enabled: service.enabled,
    findings,
    name: service.name,
    ports: service.ports ?? [],
    projectName: service.projectName,
    source: service.source ?? null,
  }, null, 2));

  if (findings.length > 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
