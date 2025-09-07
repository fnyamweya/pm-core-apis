import fs from 'fs/promises';
import yaml from 'js-yaml';
import moment from 'moment';
import path from 'path';

const baseDir = path.resolve(__dirname, '../../../');
const directories = [
  path.join(baseDir, 'src/policies/resources'),
  path.join(baseDir, 'src/policies/roles'),
];

interface Metadata {
  createdBy: string;
  createdAt: string;
  [key: string]: any;
}

interface YamlData {
  metadata?: Metadata;
  [key: string]: any;
}

async function traverseDirectory(dir: string, pushedBy: string): Promise<void> {
  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        // Recursively traverse subdirectories
        await traverseDirectory(itemPath, pushedBy);
      } else if (stat.isFile() && item.endsWith('.yaml')) {
        // Process YAML files
        try {
          const fileContent = await fs.readFile(itemPath, 'utf8');
          const data = yaml.load(fileContent) as YamlData;

          // Update metadata
          data.metadata = {
            ...data.metadata,
            createdBy: pushedBy,
            createdAt: moment().toISOString(),
          };

          await fs.writeFile(itemPath, yaml.dump(data, { lineWidth: -1 }));
          console.log(`Updated metadata in ${itemPath}`);
        } catch (err) {
          console.error(`Error processing file ${itemPath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Error traversing directory ${dir}:`, err);
  }
}

export async function updateMetadata(pushedBy: string): Promise<void> {
  for (const dir of directories) {
    try {
      await fs.access(dir);
      await traverseDirectory(dir, pushedBy);
    } catch (err) {
      console.warn(`Directory ${dir} does not exist. Skipping...`);
    }
  }
}

// Run the metadata update
(async () => {
  const pushedBy = process.env.PUSHED_BY;
  if (!pushedBy) {
    console.error('PUSHED_BY environment variable is not set. Exiting...');
    process.exit(1);
  }

  try {
    await updateMetadata(pushedBy);
  } catch (err) {
    console.error('Error updating metadata:', err);
  }
})();
