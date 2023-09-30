import { Command } from "commander";
import { z } from "zod";

import {
  checkPackages,
  checkInstalls,
  getProjectName,
} from "../common/prompts.js";
import { generateKickstartConfig } from "../common/update-kickstart-config.js";
import { generateStarter } from "./helpers/generate-starter.js";
import { parsePath } from "./helpers/parse-path.js";
import { installPackages } from "./helpers/install-packages.js";
import { createEnv } from "../common/update-env.js";
import { installDeps } from "./helpers/install-deps.js";
import { logger } from "@/utils/logger.js";
import { renderTitle } from "@/utils/render-title.js";
import { getUserPkgManager } from "@/utils/get-user-pkg-manager.js";

const ALL_PACKAGES = {
  drizzle: true,
  nextauth: true,
  trpc: true,
  shadcn: true,
};

const initOptionsSchema = z.object({
  yes: z.boolean(),
});

const initDirSchema = z.string().min(1);

export const initAction = async (dir: string | undefined, opts: string) => {
  renderTitle();

  const { projectName, dirName } = await getProjectName(dir);
  const { yes: fullInstall } = initOptionsSchema.parse(opts);
  const initDir = initDirSchema.parse(dirName);
  const projectDir = parsePath(initDir);

  const packages = fullInstall ? ALL_PACKAGES : await checkPackages();
  const installs = await checkInstalls();

  const initGit = installs.git;
  const shouldInstallDeps = installs.deps;

  await generateStarter({ projectDir, projectName, initGit });
  installPackages({ projectDir, packages });
  createEnv({ projectDir, packages });
  generateKickstartConfig({ projectDir, packages });
  if (shouldInstallDeps) await installDeps(projectDir);

  const pkgManager = getUserPkgManager();
  logger.info("Project has been successfully initialized");
  logger.info("\nNext steps:");
  projectName !== "." && logger.info(`  cd ${projectName}`);
  if (!shouldInstallDeps) logger.info(`  ${pkgManager} install`);
  if (packages.drizzle) logger.info(`  ${pkgManager} run db:generate`);
  logger.info(`  ${pkgManager} run dev`);
  logger.success("\nHappy hacking!\n");
  process.exit(0);
};

export const init = new Command()
  .name("init")
  .description("initialize new project")
  .argument("[dir]", "directory to init a project")
  .option("-y, --yes", "skip confirmation prompt", false)
  .action(initAction);
