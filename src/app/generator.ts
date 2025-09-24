import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';

export interface AppConfig {
  name: string;
  projectPath: string;
  features?: {
    dashboard?: boolean;
    api?: boolean;
    database?: boolean;
    webhooks?: boolean;
    approvals?: boolean;
  };
  stages?: string[];
}

export class AppGenerator {
  constructor(private projectPath: string) {}

  /**
   * Generate a Next.js app for workflow data management
   */
  async generateApp(config: AppConfig): Promise<void> {
    const appPath = path.join(this.projectPath, config.name);

    // Check if app already exists
    try {
      await fs.access(appPath);
      throw new Error(`App directory ${config.name} already exists`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Create app structure
    await this.createAppStructure(appPath);

    // Generate files based on features
    await this.generatePackageJson(appPath, config);
    await this.generateDatabaseSchema(appPath);
    await this.generateApiEndpoints(appPath, config);
    await this.generateDashboard(appPath, config);
    await this.generateComponents(appPath, config);
    await this.generateStyles(appPath);
    await this.generateEnvFile(appPath);

    // Initialize git ignore
    await this.generateGitIgnore(appPath);
  }

  private async createAppStructure(appPath: string): Promise<void> {
    const dirs = [
      'app',
      'app/api',
      'app/api/webhook',
      'app/api/workflow',
      'app/dashboard',
      'app/items',
      'components',
      'lib',
      'styles',
      'public',
      'data'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(appPath, dir), { recursive: true });
    }
  }

  private async generatePackageJson(appPath: string, config: AppConfig): Promise<void> {
    const packageJson = {
      name: config.name,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        'db:init': 'node scripts/init-db.js'
      },
      dependencies: {
        next: '14.2.0',
        react: '^18',
        'react-dom': '^18',
        sqlite3: '^5.1.6',
        sqlite: '^5.0.0',
        axios: '^1.6.0',
        'date-fns': '^3.0.0',
        clsx: '^2.0.0'
      },
      devDependencies: {
        '@types/node': '^20',
        '@types/react': '^18',
        '@types/react-dom': '^18',
        typescript: '^5',
        tailwindcss: '^3.4.0',
        autoprefixer: '^10.0.0',
        postcss: '^8'
      }
    };

    await fs.writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  private async generateDatabaseSchema(appPath: string): Promise<void> {
    const dbSetup = `import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), 'data', 'workflow.db'),
      driver: sqlite3.Database
    });

    // Initialize tables
    await db.exec(\`
      CREATE TABLE IF NOT EXISTS workflow_items (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'pending',
        stage TEXT,
        data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT,
        workflow_name TEXT,
        item_id TEXT,
        status TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        metadata JSON,
        FOREIGN KEY (item_id) REFERENCES workflow_items(id)
      );

      CREATE TABLE IF NOT EXISTS node_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT,
        node_id TEXT,
        node_type TEXT,
        input JSON,
        output JSON,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (execution_id) REFERENCES workflow_executions(id)
      );

      CREATE TABLE IF NOT EXISTS workflow_checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT,
        checkpoint_name TEXT,
        node_id TEXT,
        checkpoint_data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_id, checkpoint_name)
      );

      CREATE TABLE IF NOT EXISTS workflow_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT,
        error_message TEXT,
        error_details JSON,
        node_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_items_status ON workflow_items(status);
      CREATE INDEX IF NOT EXISTS idx_items_stage ON workflow_items(stage);
      CREATE INDEX IF NOT EXISTS idx_executions_item ON workflow_executions(item_id);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_item ON workflow_checkpoints(item_id);
    \`);
  }

  return db;
}

export async function createItem(id: string, data: any, stage?: string) {
  const db = await getDb();
  await db.run(
    'INSERT INTO workflow_items (id, data, stage) VALUES (?, ?, ?)',
    [id, JSON.stringify(data), stage || 'created']
  );
}

export async function updateItem(id: string, updates: any) {
  const db = await getDb();
  const current = await db.get('SELECT data FROM workflow_items WHERE id = ?', id);
  const merged = { ...JSON.parse(current.data), ...updates };

  await db.run(
    'UPDATE workflow_items SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(merged), id]
  );
}

export async function getItems(filter?: { status?: string; stage?: string }) {
  const db = await getDb();
  let query = 'SELECT * FROM workflow_items WHERE 1=1';
  const params: any[] = [];

  if (filter?.status) {
    query += ' AND status = ?';
    params.push(filter.status);
  }
  if (filter?.stage) {
    query += ' AND stage = ?';
    params.push(filter.stage);
  }

  query += ' ORDER BY created_at DESC';
  return await db.all(query, params);
}

export async function saveCheckpoint(itemId: string, checkpointName: string, data: any, nodeId?: string) {
  const db = await getDb();
  await db.run(
    \`INSERT OR REPLACE INTO workflow_checkpoints (item_id, checkpoint_name, checkpoint_data, node_id)
     VALUES (?, ?, ?, ?)\`,
    [itemId, checkpointName, JSON.stringify(data), nodeId]
  );
}

export async function getCheckpoint(itemId: string, checkpointName: string) {
  const db = await getDb();
  return await db.get(
    'SELECT * FROM workflow_checkpoints WHERE item_id = ? AND checkpoint_name = ?',
    [itemId, checkpointName]
  );
}
`;

    await fs.writeFile(path.join(appPath, 'lib', 'db.ts'), dbSetup);
  }

  private async generateApiEndpoints(appPath: string, config: AppConfig): Promise<void> {
    // Webhook receiver endpoint
    const webhookEndpoint = `import { NextRequest, NextResponse } from 'next/server';
import { createItem, updateItem } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, itemId, data } = body;

    switch (action) {
      case 'create_item':
        await createItem(itemId, data);
        return NextResponse.json({ success: true, itemId });

      case 'update_item':
        await updateItem(itemId, data);
        return NextResponse.json({ success: true, itemId });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

    await fs.writeFile(
      path.join(appPath, 'app', 'api', 'webhook', 'receive', 'route.ts'),
      webhookEndpoint
    );

    // Workflow storage endpoint
    const workflowStorage = `import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveCheckpoint } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, executionId, itemId, ...data } = body;
    const db = await getDb();

    switch (action) {
      case 'start_execution':
        await db.run(
          \`INSERT INTO workflow_executions (id, workflow_id, workflow_name, item_id, status, metadata)
           VALUES (?, ?, ?, ?, 'running', ?)\`,
          [executionId || data.executionId, data.workflowId, data.workflowName, itemId, JSON.stringify(data.metadata)]
        );
        return NextResponse.json({ success: true, executionId });

      case 'end_execution':
        await db.run(
          \`UPDATE workflow_executions SET status = ?, ended_at = CURRENT_TIMESTAMP
           WHERE id = ?\`,
          [data.status || 'completed', executionId]
        );
        return NextResponse.json({ success: true, executionId });

      case 'store_node':
        await db.run(
          \`INSERT INTO node_executions (execution_id, node_id, node_type, input, output)
           VALUES (?, ?, ?, ?, ?)\`,
          [executionId, data.nodeId, data.nodeType, JSON.stringify(data.input), JSON.stringify(data.output)]
        );
        return NextResponse.json({ success: true });

      case 'save_checkpoint':
        await saveCheckpoint(itemId, data.checkpointName, data.checkpointData, data.nodeId);
        return NextResponse.json({ success: true });

      case 'track_error':
        await db.run(
          \`INSERT INTO workflow_errors (execution_id, error_message, error_details, node_id)
           VALUES (?, ?, ?, ?)\`,
          [executionId, data.errorMessage, JSON.stringify(data.errorDetails), data.nodeId]
        );
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Storage error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

    await fs.writeFile(
      path.join(appPath, 'app', 'api', 'workflow', 'store', 'route.ts'),
      workflowStorage
    );

    // Workflow retrieval endpoint
    const workflowRetrieve = `import { NextRequest, NextResponse } from 'next/server';
import { getCheckpoint, getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const itemId = searchParams.get('itemId');
    const checkpointName = searchParams.get('checkpointName');

    switch (action) {
      case 'get_checkpoint':
        if (!itemId || !checkpointName) {
          return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }
        const checkpoint = await getCheckpoint(itemId, checkpointName);
        return NextResponse.json({
          checkpointData: checkpoint ? JSON.parse(checkpoint.checkpoint_data) : null
        });

      case 'get_workflow_history':
        if (!itemId) {
          return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
        }
        const db = await getDb();
        const executions = await db.all(
          'SELECT * FROM workflow_executions WHERE item_id = ? ORDER BY started_at DESC',
          itemId
        );
        return NextResponse.json({ executions });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

    await fs.writeFile(
      path.join(appPath, 'app', 'api', 'workflow', 'retrieve', 'route.ts'),
      workflowRetrieve
    );
  }

  private async generateDashboard(appPath: string, config: AppConfig): Promise<void> {
    const dashboardPage = `'use client';

import { useState, useEffect } from 'react';
import StatsCard from '@/components/StatsCard';
import ItemsTable from '@/components/ItemsTable';
import PipelineView from '@/components/PipelineView';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [view, setView] = useState<'table' | 'pipeline'>('table');

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      setItems(data.items);

      // Calculate stats
      const newStats = {
        total: data.items.length,
        pending: data.items.filter((i: any) => i.status === 'pending').length,
        processing: data.items.filter((i: any) => i.status === 'processing').length,
        completed: data.items.filter((i: any) => i.status === 'completed').length,
        failed: data.items.filter((i: any) => i.status === 'failed').length
      };
      setStats(newStats);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor and manage workflow items</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <StatsCard title="Total Items" value={stats.total} color="blue" />
        <StatsCard title="Pending" value={stats.pending} color="yellow" />
        <StatsCard title="Processing" value={stats.processing} color="orange" />
        <StatsCard title="Completed" value={stats.completed} color="green" />
        <StatsCard title="Failed" value={stats.failed} color="red" />
      </div>

      {/* View Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setView('table')}
          className={\`px-4 py-2 rounded \${
            view === 'table'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }\`}
        >
          Table View
        </button>
        <button
          onClick={() => setView('pipeline')}
          className={\`px-4 py-2 rounded \${
            view === 'pipeline'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }\`}
        >
          Pipeline View
        </button>
      </div>

      {/* Content */}
      {view === 'table' ? (
        <ItemsTable items={items} onRefresh={fetchItems} />
      ) : (
        <PipelineView items={items} stages={${JSON.stringify(config.stages || ['created', 'processing', 'review', 'completed'])}} />
      )}
    </div>
  );
}
`;

    await fs.writeFile(
      path.join(appPath, 'app', 'dashboard', 'page.tsx'),
      dashboardPage
    );

    // Items API endpoint
    const itemsApi = `import { NextResponse } from 'next/server';
import { getItems } from '@/lib/db';

export async function GET() {
  try {
    const items = await getItems();
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

    await fs.writeFile(
      path.join(appPath, 'app', 'api', 'items', 'route.ts'),
      itemsApi
    );
  }

  private async generateComponents(appPath: string, config: AppConfig): Promise<void> {
    // Stats Card Component
    const statsCard = `interface StatsCardProps {
  title: string;
  value: number;
  color: 'blue' | 'yellow' | 'orange' | 'green' | 'red';
}

export default function StatsCard({ title, value, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className={\`p-4 rounded-lg border-2 \${colorClasses[color]}\`}>
      <h3 className="text-sm font-medium opacity-75">{title}</h3>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
`;

    await fs.writeFile(path.join(appPath, 'components', 'StatsCard.tsx'), statsCard);

    // Items Table Component
    const itemsTable = `import { useState } from 'react';
import Link from 'next/link';

interface Item {
  id: string;
  status: string;
  stage: string;
  data: string;
  created_at: string;
  updated_at: string;
}

interface ItemsTableProps {
  items: Item[];
  onRefresh: () => void;
}

export default function ItemsTable({ items, onRefresh }: ItemsTableProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredItems = filter === 'all'
    ? items
    : items.filter(item => item.status === filter);

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return (
      <span className={\`px-2 py-1 rounded text-xs font-medium \${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}\`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-medium">
                  <Link href={\`/items/\${item.id}\`} className="text-blue-600 hover:underline">
                    {item.id}
                  </Link>
                </td>
                <td className="px-4 py-2">{getStatusBadge(item.status)}</td>
                <td className="px-4 py-2 text-sm">{item.stage}</td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={\`/items/\${item.id}\`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

    await fs.writeFile(path.join(appPath, 'components', 'ItemsTable.tsx'), itemsTable);

    // Pipeline View Component
    const pipelineView = `interface PipelineViewProps {
  items: any[];
  stages: string[];
}

export default function PipelineView({ items, stages }: PipelineViewProps) {
  const getItemsInStage = (stage: string) => {
    return items.filter(item => item.stage === stage);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stages.map(stage => (
        <div key={stage} className="bg-white rounded-lg shadow">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold capitalize">{stage}</h3>
            <p className="text-sm text-gray-500">{getItemsInStage(stage).length} items</p>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {getItemsInStage(stage).map(item => (
              <div
                key={item.id}
                className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
              >
                <div className="text-sm font-medium">{item.id}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(item.updated_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
`;

    await fs.writeFile(path.join(appPath, 'components', 'PipelineView.tsx'), pipelineView);
  }

  private async generateStyles(appPath: string): Promise<void> {
    // Main layout
    const layout = `import './globals.css';
import Link from 'next/link';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar */}
          <div className="w-64 bg-gray-800 text-white">
            <div className="p-4">
              <h2 className="text-xl font-bold">Workflow Manager</h2>
            </div>
            <nav className="mt-4">
              <Link
                href="/dashboard"
                className="block px-4 py-2 hover:bg-gray-700"
              >
                Dashboard
              </Link>
              <Link
                href="/items"
                className="block px-4 py-2 hover:bg-gray-700"
              >
                All Items
              </Link>
              <Link
                href="/executions"
                className="block px-4 py-2 hover:bg-gray-700"
              >
                Executions
              </Link>
              <Link
                href="/settings"
                className="block px-4 py-2 hover:bg-gray-700"
              >
                Settings
              </Link>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
`;

    await fs.writeFile(path.join(appPath, 'app', 'layout.tsx'), layout);

    // Global CSS
    const globals = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

    await fs.writeFile(path.join(appPath, 'app', 'globals.css'), globals);

    // Tailwind config
    const tailwindConfig = `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`;

    await fs.writeFile(path.join(appPath, 'tailwind.config.ts'), tailwindConfig);

    // PostCSS config
    const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

    await fs.writeFile(path.join(appPath, 'postcss.config.js'), postcssConfig);
  }

  private async generateEnvFile(appPath: string): Promise<void> {
    const envExample = `# N8n Integration
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# App Configuration
APP_URL=http://localhost:3000
WORKFLOW_STORAGE_URL=http://localhost:3000

# Database
DATABASE_PATH=./data/workflow.db

# Workflow Stages (comma-separated)
WORKFLOW_STAGES=created,processing,review,completed
`;

    await fs.writeFile(path.join(appPath, '.env.example'), envExample);
    await fs.writeFile(path.join(appPath, '.env.local'), envExample);
  }

  private async generateGitIgnore(appPath: string): Promise<void> {
    const gitignore = `# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/.next
/out

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Database
/data/*.db
/data/*.db-journal
`;

    await fs.writeFile(path.join(appPath, '.gitignore'), gitignore);
  }
}