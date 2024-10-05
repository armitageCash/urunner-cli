#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { program } = require("commander");

const packageJson = require("./package.json");

program
  .version(packageJson.version, "--version", "Output the current version")
  .description("Generate a scaffold for a use case")
  .action(() => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Enter the name of the use case: ", (useCaseName) => {
      generateUseCaseScaffold(useCaseName);
      rl.close();
    });
  });

program.parse(process.argv);

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function createDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createFile(filePath, content) {
  fs.writeFileSync(filePath, content);
}

function generateUseCaseScaffold(useCaseName) {
  const basePath = path.join(process.cwd(), "src", "cases", useCaseName);

  // Crear directorios
  createDirectory(basePath);
  createDirectory(path.join(basePath, "impl"));
  createDirectory(path.join(basePath, "manager"));
  createDirectory(path.join(basePath, "types"));
  createDirectory(path.join(basePath, "__tests__"));

  // Crear archivos
  const indexContent = `
import "dotenv/config";
import { createApp, UseCaseResult, UsecaseType } from "urunner-lib";
import { Logger } from "@/shared/logger";
import { ${useCaseName}Data, Input, Output } from "./types";
import { ${capitalize(useCaseName)}ServiceImpl } from "./impl";

interface Dependencies {
  logger: Logger;
  ${useCaseName}Service: ${capitalize(useCaseName)}ServiceImpl;
}

type ${capitalize(useCaseName)}UsecaseType = UsecaseType<
  Input,
  Dependencies,
  UseCaseResult<${useCaseName}Data>
>;

const adapter = (fn: ${capitalize(
    useCaseName
  )}UsecaseType) => async (params: Input, dependencies: Dependencies) => {
  return await fn(params, dependencies);
};

export const ${useCaseName}: ${capitalize(useCaseName)}UsecaseType = async (
  params: Input,
  dependencies: Dependencies
) => {
  const { logger: log, ${useCaseName}Service } = dependencies;
  try {
    const response = await ${useCaseName}Service.execute(params);
    return {
      data: response,
      status: "success",
      message: "${capitalize(useCaseName)} ejecutado correctamente.",
    };
  } catch (e) {
    return {
      data: null,
      message: "Error al ejecutar ${useCaseName}",
      status: "error",
    };
  }
};

const usecase${capitalize(
    useCaseName
  )} = createApp(adapter(${useCaseName})).attach(
  (dependencies: Dependencies) => {
    dependencies.logger = new Logger();
    dependencies.${useCaseName}Service = new ${capitalize(
    useCaseName
  )}ServiceImpl();
  }
);

export default usecase${capitalize(useCaseName)};
`;

  const managerContent = `
import { ${useCaseName}Data, Input } from "../types";

export default interface ${capitalize(useCaseName)}ServiceManager {
  ${useCaseName}(params: Input): Promise<${useCaseName}Data | undefined>;
}
`;

  const typesContent = `
export interface Input {
  // Define your input type here
}

export interface ${useCaseName}Data {
  // Define your ${useCaseName}Data type here
}

export interface Output {
  // Define your output type here
}
`;

  const implContent = `
import { ${useCaseName}Data, Input } from "../types";

export default interface ${capitalize(useCaseName)}ServiceManager {
  ${useCaseName}(params: Input): Promise<${useCaseName}Data | undefined>;
}
`;

  const testContent = `
import usecase${capitalize(useCaseName)} from '../index';

describe('${capitalize(useCaseName)} Use Case', () => {
  it('should execute successfully', async () => {
    // Write your test here
  });

  it('should handle errors', async () => {
    // Write your error handling test here
  });
});
`;

  createFile(path.join(basePath, "index.ts"), indexContent);
  createFile(path.join(basePath, "manager", "index.ts"), managerContent);
  createFile(path.join(basePath, "types", "index.ts"), typesContent);
  createFile(path.join(basePath, "impl", "index.ts"), implContent);
  createFile(
    path.join(basePath, "__tests__", `${useCaseName}.test.ts`),
    testContent
  );

  console.log(
    `Scaffold for use case '${useCaseName}' has been created successfully in src/cases/${useCaseName}.`
  );
}
