const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const { logging } = require('@angular-devkit/core');
const { VERSION } = require('@angular/core');
const { build } = require('storybook/internal/core-server');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseTarget(target) {
  const [project, name, configuration] = target.split(':');

  return { project, target: name, configuration };
}

function getProjectConfiguration(workspaceRoot, projectName) {
  if (projectName === 'ui') {
    return readJson(path.join(workspaceRoot, 'libs/ui/project.json'));
  }

  throw new Error(`Unsupported project: ${projectName}`);
}

function getTargetOptions(projectConfig, targetName, configuration) {
  const target = projectConfig.targets?.[targetName];

  if (!target) {
    return {};
  }

  return {
    ...(target.options ?? {}),
    ...(configuration ? (target.configurations?.[configuration] ?? {}) : {}),
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      mode: { type: 'string' },
      project: { type: 'string' },
      configDir: { type: 'string' },
      tsConfig: { type: 'string' },
      browserTarget: { type: 'string' },
      style: { type: 'string', multiple: true },
      port: { type: 'string' },
      outputDir: { type: 'string' },
      host: { type: 'string' },
      ci: { type: 'boolean' },
      quiet: { type: 'boolean' },
      noOpen: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  const mode = values.mode;
  const projectName = values.project;
  const configDir = values.configDir;
  const tsConfig = values.tsConfig;
  const browserTarget = values.browserTarget;
  const styles = values.style ?? [];

  if (!mode || !projectName || !configDir || !tsConfig || !browserTarget) {
    throw new Error('Missing required Storybook runner options.');
  }

  if (mode !== 'dev' && mode !== 'static') {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  const workspaceRoot = process.cwd();
  const projectConfig = getProjectConfiguration(workspaceRoot, projectName);
  const browserTargetRef = parseTarget(browserTarget);
  const currentTargetName = mode === 'dev' ? 'storybook' : 'build-storybook';
  const currentTargetOptions = {
    configDir,
    tsConfig,
    browserTarget,
    styles,
    quiet: Boolean(values.quiet),
    ...(mode === 'dev'
      ? {
          port: values.port ? Number(values.port) : 4400,
          ci: Boolean(values.ci),
          open: values.noOpen ? false : true,
          host: values.host,
        }
      : {
          outputDir: values.outputDir,
        }),
  };

  const angularBuilderContext = {
    target: {
      project: projectName,
      target: currentTargetName,
      configuration: values.ci ? 'ci' : undefined,
      builder: '',
      options: currentTargetOptions,
    },
    workspaceRoot,
    logger: new logging.Logger('Storybook'),
    getProjectMetadata: async () => ({}),
    getTargetOptions: async (target) => {
      if (!target || target.project !== projectName) {
        return {};
      }

      if (target.target === currentTargetName) {
        return currentTargetOptions;
      }

      return getTargetOptions(
        projectConfig,
        target.target,
        target.configuration,
      );
    },
  };

  process.env.NODE_ENV =
    process.env.NODE_ENV ?? (mode === 'dev' ? 'development' : 'production');

  await build({
    mode,
    configDir,
    tsConfig,
    quiet: Boolean(values.quiet),
    ...(mode === 'dev'
      ? {
          port: currentTargetOptions.port,
          ci: Boolean(values.ci),
          open: currentTargetOptions.open,
          host: values.host,
        }
      : {
          outputDir: values.outputDir,
        }),
    angularBrowserTarget: `${browserTargetRef.project}:${browserTargetRef.target}${browserTargetRef.configuration ? `:${browserTargetRef.configuration}` : ''}`,
    angularBuilderContext,
    angularBuilderOptions: {
      styles,
      experimentalZoneless: Boolean(
        VERSION.major && Number(VERSION.major) >= 21,
      ),
    },
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
