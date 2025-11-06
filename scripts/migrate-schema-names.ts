/**
 * Migration script to update existing schemas:
 * - Remove `name` property from FormSchema objects
 * - Ensure schema.title exists (use control set name or schema name as fallback)
 * 
 * Run with: npx tsx scripts/migrate-schema-names.ts
 */

import { init } from '@instantdb/admin';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

const APP_ID = process.env.INSTANT_APP_ID || process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing required environment variables:');
  console.error('  INSTANT_APP_ID or NEXT_PUBLIC_INSTANT_APP_ID');
  console.error('  INSTANT_ADMIN_TOKEN');
  console.error('\nMake sure these are set in your .env.local file');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

interface OldFormSchema {
  id: string;
  name?: string;
  schema: {
    title?: string;
    type: string;
    properties?: any;
  };
  uiSchema?: any;
  config: any;
}

interface ControlSet {
  id: string;
  name: string;
  schemas: OldFormSchema[];
}

interface Project {
  id: string;
  name: string;
  controlSets?: ControlSet[];
  schemas?: OldFormSchema[]; // Legacy
  mqttConfig?: any;
  userId?: string;
  public?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

function migrateSchema(schema: OldFormSchema, controlSetName?: string): OldFormSchema {
  // Check if migration is needed
  const hasName = 'name' in schema && schema.name !== undefined;
  const needsTitle = !schema.schema.title;
  
  if (!hasName && !needsTitle) {
    return schema; // No changes needed
  }
  
  // Remove name property if it exists
  const { name, ...schemaWithoutName } = schema;
  
  // Ensure schema.title exists
  if (!schemaWithoutName.schema.title) {
    // Use old name property, control set name, or generate a default
    schemaWithoutName.schema.title = name || controlSetName || 'Untitled Schema';
  }
  
  return schemaWithoutName;
}

async function migrateProject(project: Project): Promise<boolean> {
  let updated = false;
  const updates: any = {};
  
  // Migrate controlSets if they exist
  if (project.controlSets && Array.isArray(project.controlSets)) {
    const migratedControlSets = project.controlSets.map((controlSet: ControlSet) => {
      let controlSetUpdated = false;
      const migratedSchemas = controlSet.schemas.map(schema => {
        // Get control set name from schema title or old control set name
        const controlSetName = schema.schema?.title || controlSet.name;
        const migrated = migrateSchema(schema, controlSetName);
        // Compare by serializing to check if changed
        if (JSON.stringify(migrated) !== JSON.stringify(schema)) {
          controlSetUpdated = true;
          updated = true;
        }
        return migrated;
      });
      
      // Remove name property from control set (use schema.title instead)
      const hasName = 'name' in controlSet && controlSet.name !== undefined;
      if (hasName || controlSetUpdated) {
        const { name, ...controlSetWithoutName } = controlSet;
        updated = true;
        return {
          ...controlSetWithoutName,
          schemas: migratedSchemas
        };
      }
      return controlSet;
    });
    
    if (updated) {
      updates.controlSets = migratedControlSets;
    }
  }
  
  // Migrate legacy schemas if they exist
  if (project.schemas && Array.isArray(project.schemas)) {
    const migratedSchemas = project.schemas.map(schema => {
      const migrated = migrateSchema(schema);
      // Compare by serializing to check if changed
      if (JSON.stringify(migrated) !== JSON.stringify(schema)) {
        updated = true;
      }
      return migrated;
    });
    
    if (updated) {
      updates.schemas = migratedSchemas;
    }
  }
  
  if (updated) {
    updates.updatedAt = Date.now();
    await db.transact(db.tx.projects[project.id].update(updates));
    return true;
  }
  
  return false;
}

async function runMigration() {
  console.log('Starting schema migration...');
  console.log(`App ID: ${APP_ID}`);
  
  try {
    // Fetch all projects
    const result = await db.query({
      projects: {}
    });
    
    const projects = result?.projects ? Object.values(result.projects) : [];
    
    if (projects.length === 0) {
      console.log('No projects found');
      return;
    }
    
    console.log(`Found ${projects.length} projects`);
    
    let migratedCount = 0;
    for (const project of projects) {
      const migrated = await migrateProject(project as Project);
      if (migrated) {
        migratedCount++;
        console.log(`✓ Migrated project: ${project.name || project.id}`);
      }
    }
    
    console.log(`\nMigration complete!`);
    console.log(`  Total projects: ${projects.length}`);
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Unchanged: ${projects.length - migratedCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

