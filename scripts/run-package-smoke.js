// Package smoke: packs the package, installs it into a temporary consumer and checks it.
// Each step lives in scripts/package-smoke/; this runner owns their order and the result.
const fs = require('node:fs');
const { createSmokeContext } = require('./package-smoke/harness');
const { checkPackedArtifact } = require('./package-smoke/packed-artifact');
const { installConsumer } = require('./package-smoke/consumer-install');
const { checkImportSafety } = require('./package-smoke/import-safety');
const { checkLoggingPolicy } = require('./package-smoke/logging-policy');
const { checkCjsRuntime } = require('./package-smoke/cjs-runtime');
const { checkEsmRuntime } = require('./package-smoke/esm-runtime');
const { checkConsumerTypes } = require('./package-smoke/consumer-types');
const { checkPrismaClientGenerator } = require('./package-smoke/prisma-client-generator');

const context = createSmokeContext();
const { temporaryRoot } = context;

try {
  const { includedPaths, tarballPath } = checkPackedArtifact(context);
  installConsumer(context, { tarballPath });
  checkImportSafety(context);
  checkLoggingPolicy(context);
  const { readonlyWal } = checkCjsRuntime(context);
  checkEsmRuntime(context);
  const { appDirectory: prismaClientConsumer } = checkPrismaClientGenerator(context);
  const { registeredConsumerTypes } = checkConsumerTypes(context, { prismaClientConsumer });

  console.log(
    JSON.stringify({
      result: 'pass',
      packedFiles: includedPaths.size,
      cjs: 'pass',
      esm: 'pass',
      declarations: 'pass',
      installedArtifact: 'pass',
      safeFailureOutput: 'pass',
      externalDriverAdapter: 'pass',
      noClientOnImport: 'pass',
      noNativeAddonOnImport: 'pass',
      noQueryStringFiles: 'pass',
      readonlyWal,
      prismaClientGenerator: 'pass',
      registeredConsumerTypes,
      cleanup: temporaryRoot,
    })
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
