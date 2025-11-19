'use client';

import React, { useState } from 'react';
import { getInstantDB } from '@/app/utils/instantdb';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormSchema } from '@/types/formSchema';
import { ControlSet } from '@/types/controlSet';
import { id } from '@instantdb/react';
import { generateCommandId } from '@/app/utils/idGenerator';
import { MQTTConfig, getEmptyMQTTConfig } from '@/app/utils/mqttConfig';

interface Project {
  id: string;
  name: string;
  mqttConfig: MQTTConfig;
  controlSets: ControlSet[];
  schemas?: FormSchema[]; // Backward compatibility
  userId: string;
  public?: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const db = getInstantDB();

  if (!db) {
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold mb-4 uppercase tracking-wider">Projects</h1>
          <div className="text-sm">InstantDB not configured.</div>
        </div>
      </div>
    );
  }

  const { isLoading, user, error } = db.useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Query projects - permissions will automatically filter to user's own projects
  // Ordered by createdAt descending (newest first)
  const { data } = db.useQuery({
    projects: {
      $: {
        order: { createdAt: 'desc' },
      },
    },
  });

  const projects: Project[] = (data?.projects || []).map((p: any) => ({
    id: p.id,
    name: p.name || '',
    mqttConfig: p.mqttConfig || getEmptyMQTTConfig(),
    controlSets: p.controlSets || (p.schemas ? [{ id: 'default', name: 'Default', schemas: p.schemas }] : []),
    schemas: p.schemas, // Keep for backward compatibility
    userId: p.userId || '',
    public: (p.public as boolean | undefined) ?? false,
    createdAt: p.createdAt || 0,
    updatedAt: p.updatedAt || 0,
  }));


  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectName.trim()) return;

    setIsCreating(true);
    try {
      // Create default control sets
      const defaultControlSets: ControlSet[] = [
        {
          id: generateCommandId(),
          schemas: [
            {
              id: generateCommandId(),
              type: 'html',
              html: `<div class="flex flex-col items-center p-4">
  <h2 class="text-lg font-semibold mb-4">WiFi Setup</h2>

  <div class="space-y-4 max-w-sm mx-auto">
    <div>
      <label class="block text-sm font-medium mb-2">Network Name (SSID):</label>
      <input
        type="text"
        data-field="ssid"
        class="w-full"
        placeholder="Enter WiFi network name"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-2">Password:</label>
      <input
        type="password"
        data-field="password"
        class="w-full"
        placeholder="Enter WiFi password"
      />
    </div>

    <button
      type="submit"
      data-command="PROVISION:ssid={ssid};pass={password}"
      data-send-mode="onSubmit"
      class="w-full py-2 px-4 font-medium"
    >
      Connect to WiFi
    </button>
  </div>
</div>`,
              htmlConfig: {
                globalSendMode: 'onSubmit',
                debounceMs: 300
              },
              schema: {
                title: 'WiFi Provisioning',
                type: 'object'
              }
            },
          ],
        },
        {
          id: generateCommandId(),
          schemas: [
            {
              id: generateCommandId(),
              type: 'html',
              html: `<div class="space-y-4 p-4">
  <h3 class="text-lg font-semibold mb-4">Servo Controls</h3>

  <div class="grid grid-cols-2 gap-2">
    <button data-command="smoothMove:angle=0;duration=3000;servo=1" class="px-3 py-2 text-sm font-medium">
      🐌 Open Slowly
    </button>
    <button data-command="smoothMove:angle=180;duration=3000;servo=1" class="px-3 py-2 text-sm font-medium">
      🐌 Close Slowly
    </button>
    <button data-command="smoothMove:angle=0;duration=100;servo=1" class="px-3 py-2 text-sm font-medium">
      ⚡ Open Fast
    </button>
    <button data-command="smoothMove:angle=180;duration=100;servo=1" class="px-3 py-2 text-sm font-medium">
      ⚡ Close Fast
    </button>
  </div>
</div>`,
              htmlConfig: {
                globalSendMode: 'immediate',
                debounceMs: 300
              },
              schema: {
                title: 'Movement Controls',
                type: 'object'
              }
            },
          ],
        },
      ];

      const projectIdValue = id();

      db.transact(
        db.tx.projects[projectIdValue].update({
          name: projectName.trim(),
          mqttConfig: getEmptyMQTTConfig(),
          controlSets: defaultControlSets,
          userId: user.id,
          public: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      );

      setProjectName('');
      setShowCreateForm(false);
      router.push(`/projects/${projectIdValue}`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      alert(`Failed to create project: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      db.transact(db.tx.projects[projectId].delete());
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      alert(`Failed to delete project: ${err.message || 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-2 flex items-center justify-center">
        <div className="text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold mb-4 uppercase tracking-wider">Projects</h1>
          <div className="text-sm text-red-400">Auth error: {error.message}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold mb-4 uppercase tracking-wider">Projects</h1>
          <div className="text-sm">
            Not signed in. <a href="/" className="underline">Go home</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold uppercase tracking-wider">Projects</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs px-2 py-1"
          >
            {showCreateForm ? 'CANCEL' : '+ CREATE PROJECT'}
          </button>
        </div>

          {showCreateForm && (
            <form onSubmit={createProject} className="border border-green-500 p-3 mb-4">
              <div className="mb-2">
                <label htmlFor="projectName" className="block text-xs mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-2 py-1 text-sm"
                  placeholder="Enter project name..."
                  required
                  disabled={isCreating}
                />
              </div>
              <button
                type="submit"
                disabled={!projectName.trim() || isCreating}
                className="text-xs px-2 py-1"
              >
                {isCreating ? 'Creating...' : 'CREATE'}
              </button>
            </form>
          )}

        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="text-sm opacity-70">
              No projects yet. Create your first project to get started!
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="border border-green-500 p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-semibold mb-1">{project.name}</h3>
                  <div className="text-xs opacity-70">
                    {project.controlSets?.length || 0} control set(s) • MQTT: {project.mqttConfig?.brokerUrl || 'Not configured'}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-xs px-2 py-1 flex items-center"
                  >
                    OPEN
                  </Link>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="text-xs px-2 py-1 text-red-400"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

