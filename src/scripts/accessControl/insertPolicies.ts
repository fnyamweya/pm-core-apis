import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import databaseInstance from '../../config/database';
import { logger } from '../../utils/logger';

const directories = ['src/policies/resources', 'src/policies/roles'];

export async function insertPolicies(): Promise<void> {
  const dataSource = await databaseInstance.getDataSource();
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    for (const dir of directories) {
      const files = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.yaml'));
      for (const file of files) {
        const filePath = path.join(dir, file);
        const data = yaml.load(fs.readFileSync(filePath, 'utf8')) as {
          resource: string;
          policies: Array<{
            id?: string; // Make id optional
            action: string;
            effect: string;
            priority?: number;
            conditions?: any;
            nestedConditions?: any;
            overrides?: any[];
            timeConstraints?: any;
            geoConstraints?: any;
            validity?: any;
            customLogic?: string;
            audit?: any;
          }>;
          metadata: Record<string, any>;
        };

        // Insert policies into the database and capture generated UUIDs
        for (const policy of data.policies) {
          const query = `
            INSERT INTO access_policies (
              resource, action, effect, priority, conditions, nested_conditions, overrides,
              time_constraints, geo_constraints, validity, custom_logic, audit, metadata
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
            RETURNING id;
          `;
          const values = [
            data.resource,
            policy.action,
            policy.effect,
            policy.priority || 1,
            JSON.stringify(policy.conditions || null),
            JSON.stringify(policy.nestedConditions || null),
            JSON.stringify(policy.overrides || []),
            JSON.stringify(policy.timeConstraints || null),
            JSON.stringify(policy.geoConstraints || null),
            JSON.stringify(policy.validity || null),
            policy.customLogic || null,
            JSON.stringify(policy.audit || null),
            JSON.stringify(data.metadata),
          ];
          const result = await queryRunner.query(query, values);
          policy.id = result[0].id; // Capture the generated UUID
        }

        // Update the YAML file with the generated UUIDs
        fs.writeFileSync(filePath, yaml.dump(data, { lineWidth: -1 }));
      }
    }
  } catch (err) {
    logger.error('Error inserting policies:', err);
    process.exit(1);
  } finally {
    await queryRunner.release();
  }
}

// Run the policy insertion
(async () => {
  await insertPolicies();
})();
