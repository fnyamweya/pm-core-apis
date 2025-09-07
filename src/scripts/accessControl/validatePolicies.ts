import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'yaml';

const schemaPath = path.join(__dirname, '../../schemas/policy.schema.json');
const policySchema = require(schemaPath);

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validatePolicy = ajv.compile(policySchema);

async function validateYamlFile(filePath: string): Promise<void> {
  const yamlContent = await fs.readFile(filePath, 'utf8');
  const jsonContent = parse(yamlContent);

  const valid = validatePolicy(jsonContent);
  if (!valid) {
    console.error(`Validation failed for ${filePath}:`);
    console.error(validatePolicy.errors);
    throw new Error(`Validation errors in ${filePath}`);
  }
  console.log(`${filePath} is valid.`);
}

async function validateAllYamlInDirectory(directory: string): Promise<void> {
  const files = await fs.readdir(directory);
  const yamlFiles = files.filter((file) => file.endsWith('.yaml'));

  for (const file of yamlFiles) {
    const filePath = path.join(directory, file);
    try {
      await validateYamlFile(filePath);
    } catch (err: unknown) {
      console.error((err as Error).message);
      process.exit(1); // Fail the workflow on validation error
    }
  }
}

// Run validation on all policies
(async () => {
  const policiesDir = path.join(__dirname, '../../policies/resources');
  await validateAllYamlInDirectory(policiesDir);
})();
