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
  const basePath = path.join(process.cwd(), "src");
  const casePath = path.join(basePath, "cases", useCaseName);
  const controllerPath = path.join(basePath, "controllers");
  const repositoryPath = path.join(basePath, "repositories");
  const sharedPath = path.join(basePath, "shared");

  // Crear directorios
  createDirectory(casePath);
  createDirectory(path.join(casePath, "impl"));
  createDirectory(path.join(casePath, "manager"));
  createDirectory(path.join(casePath, "types"));
  createDirectory(path.join(casePath, "__tests__"));
  createDirectory(controllerPath);
  createDirectory(repositoryPath);
  createDirectory(sharedPath);

  // Crear archivos
  const controllerContent = `
import { ${useCaseName}Data, Input } from "@/cases/${useCaseName}/types";
import ${capitalize(
    useCaseName
  )}Repository from "@/repositories/${useCaseName}";

export default class ${capitalize(useCaseName)}Controller {
  ${useCaseName}Repository: ${capitalize(useCaseName)}Repository;

  constructor() {
    this.${useCaseName}Repository = new ${capitalize(useCaseName)}Repository();
  }

  async execute(params: Input): Promise<${useCaseName}Data> {
    const result = await this.${useCaseName}Repository.findData(params);

    if (result) {
      return Promise.resolve(result);
    }

    return Promise.reject("Data not found");
  }
}
`;

  const repositoryContent = `
import { Input, ${useCaseName}Data } from "@/cases/${useCaseName}/types";
import Repository from "@/shared/repository";

export default class ${capitalize(useCaseName)}Repository extends Repository {
  constructor() {
    super();
  }

  async findData(input: Input): Promise<${useCaseName}Data | undefined> {
    return this.database
      .instance<${useCaseName}Data>("TableName") // Especifique el nombre de la tabla aquí
      .where(input)
      .first();
  }
}
`;

  const baseRepositoryContent = `
import DatabaseService from "@/services/knex";

export default abstract class Repository {
  database: DatabaseService;

  constructor() {
    this.database = new DatabaseService();
  }

  async find<T>(query: string): Promise<T[]> {
    return this.database.instance.raw(query);
  }

  async findOne<T>(id: number): Promise<T | undefined> {
    return this.database.instance<T>('table_name').where({ id }).first();
  }

  async createOne<T>(data: Partial<T>): Promise<T> {
    const [id] = await this.database.instance<T>('table_name').insert(data);
    return this.findOne<T>(id);
  }

  async updateOne<T>(id: number, data: Partial<T>): Promise<T | undefined> {
    await this.database.instance<T>('table_name').where({ id }).update(data);
    return this.findOne<T>(id);
  }

  async deleteOne(id: number): Promise<boolean> {
    const deleted = await this.database.instance('table_name').where({ id }).delete();
    return deleted > 0;
  }
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

  const indexContent = `
import "dotenv/config";
import { createApp, UseCaseResult, UsecaseType } from "urunner-lib";
import { Logger } from "@/shared/logger";
import { ${useCaseName}Data, Input, Output } from "@/cases/${useCaseName}/types";
import { ${capitalize(
    useCaseName
  )}ServiceImpl } from "@/cases/${useCaseName}/impl";

// Define las dependencias
interface Dependencies {
  logger: Logger;
  ${useCaseName}Service: ${capitalize(useCaseName)}ServiceImpl;
}

// Define el tipo para el caso de uso
type ${capitalize(useCaseName)}UsecaseType = UsecaseType<
  Input,
  Dependencies,
  UseCaseResult<${useCaseName}Data>
>;

// Crea un adaptador
const adapter =
  (fn: ${capitalize(useCaseName)}UsecaseType) =>
  async (params: Input, dependencies: Dependencies) => {
    return await fn(params, dependencies);
  };

// Define el caso de uso
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
    console.log("e", e);
    return {
      data: null,
      message: "Error en ${useCaseName}",
      status: "error",
    };
  }
};

// Crea la instancia del caso de uso
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
import { ${useCaseName}Data, Input } from "@/cases/${useCaseName}/types";

export default interface ${capitalize(useCaseName)}ServiceManager {
  execute(params: Input): Promise<${useCaseName}Data | undefined>;
}
`;

  const implContent = `
import ${capitalize(
    useCaseName
  )}ServiceManager from "@/cases/${useCaseName}/manager";
import { ${useCaseName}Data, Input } from "@/cases/${useCaseName}/types";
import ${capitalize(
    useCaseName
  )}Controller from "@/controllers/${useCaseName}Controller";

export class ${capitalize(useCaseName)}ServiceImpl implements ${capitalize(
    useCaseName
  )}ServiceManager {
  async execute(params: Input): Promise<${useCaseName}Data> {
    return new ${capitalize(useCaseName)}Controller().execute(params);
  }
}
`;

  createFile(
    path.join(controllerPath, `${useCaseName}Controller.ts`),
    controllerContent
  );
  createFile(
    path.join(repositoryPath, `${useCaseName}Repository.ts`),
    repositoryContent
  );
  createFile(path.join(sharedPath, "repository.ts"), baseRepositoryContent);
  createFile(path.join(casePath, "types", "index.ts"), typesContent);
  createFile(path.join(casePath, "index.ts"), indexContent);
  createFile(path.join(casePath, "manager", "index.ts"), managerContent);
  createFile(path.join(casePath, "impl", "index.ts"), implContent);

  console.log(
    `Scaffold for use case '${useCaseName}' has been created successfully.`
  );
  console.log(
    `Controller created in src/controllers/${useCaseName}Controller.ts`
  );
  console.log(
    `Repository created in src/repositories/${useCaseName}Repository.ts`
  );
  console.log(`Base Repository created in src/shared/repository.ts`);
  console.log(`Types created in src/cases/${useCaseName}/types/index.ts`);
  console.log(`Main index file created in src/cases/${useCaseName}/index.ts`);
  console.log(
    `Manager file created in src/cases/${useCaseName}/manager/index.ts`
  );
  console.log(
    `Implementation file created in src/cases/${useCaseName}/impl/index.ts`
  );
}
