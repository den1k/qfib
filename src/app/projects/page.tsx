'use client';

import React, { useState } from 'react';
import { getInstantDB } from '@/app/utils/instantdb';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormSchema } from '@/types/formSchema';
import { ControlSet } from '@/types/controlSet';
import { id } from '@instantdb/react';
import { generateCommandId } from '@/app/utils/idGenerator';

interface Project {
  id: string;
  name: string;
  mqttConfig: {
    brokerUrl: string;
    username: string;
    password: string;
    commandTopic: string;
    statusTopic: string;
    clientId: string;
  };
  controlSets: ControlSet[];
  schemas?: FormSchema[]; // Backward compatibility
  userId: string;
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
          <h1 className="retro-title mb-4">Projects</h1>
          <div className="border-t border-green-500 mb-4"></div>
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
  const { data } = db.useQuery({
    projects: {},
  });

  const projects: Project[] = (data?.projects || []).map((p: any) => ({
    id: p.id,
    name: p.name || '',
    mqttConfig: p.mqttConfig || {
      brokerUrl: '',
      username: '',
      password: '',
      commandTopic: 'fible/command',
      statusTopic: 'fible/status',
      clientId: '',
    },
    controlSets: p.controlSets || (p.schemas ? [{ id: 'default', name: 'Default', schemas: p.schemas }] : []),
    schemas: p.schemas, // Keep for backward compatibility
    userId: p.userId || '',
    createdAt: p.createdAt || 0,
    updatedAt: p.updatedAt || 0,
  }));


  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectName.trim()) return;

    setIsCreating(true);
    try {
      const defaultMqttConfig = {
        brokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL || '',
        username: process.env.NEXT_PUBLIC_MQTT_USERNAME || '',
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || '',
        commandTopic: 'fible/command',
        statusTopic: 'fible/status',
        clientId: `webapp-client-${Math.random().toString(16).slice(2, 10)}`,
      };

      // Create default control sets
      const defaultControlSets: ControlSet[] = [
        {
          id: generateCommandId(),
          name: 'Default',
          schemas: [
            {
              id: generateCommandId(),
              name: 'Provisioning & Status',
              schema: {
                type: 'object',
                properties: {
                  ssid: {
                    type: 'string',
                    title: 'WiFi SSID',
                    'x-sendMode': 'never',
                    'x-group': 'WiFi Provisioning',
                  },
                  password: {
                    type: 'string',
                    title: 'WiFi Password',
                    'x-sendMode': 'never',
                    'x-group': 'WiFi Provisioning',
                  },
                },
              },
              uiSchema: {
                password: {
                  'ui:widget': 'password',
                },
                ssid: {
                  'ui:options': {
                    autocomplete: 'off',
                  },
                },
              },
              config: {
                globalSendMode: 'onSubmit',
                customButtons: [
                  {
                    id: 'provision-wifi',
                    label: '📡 Provision WiFi',
                    command: 'PROVISION:FORM_SUBMIT', // Special marker for form submission
                    group: 'WiFi',
                  },
                  {
                    id: 'get-status',
                    label: '📊 Get Status',
                    command: 'status',
                    group: 'Device',
                  },
                ],
              },
            },
          ],
        },
        {
          id: generateCommandId(),
          name: 'Movement Controls',
          schemas: [
            {
              id: generateCommandId(),
              name: 'Movement Controls',
              schema: {
                type: 'object',
                properties: {},
              },
              config: {
                globalSendMode: 'immediate',
                customButtons: [
                  { id: 'servo1-openSlow', label: '🐌 Open Slowly', command: 'smoothMove:angle=0;duration=3000;servo=1', group: 'Servo 1' },
                  { id: 'servo1-closeSlow', label: '🐌 Close Slowly', command: 'smoothMove:angle=180;duration=3000;servo=1', group: 'Servo 1' },
                  { id: 'servo1-openFast', label: '⚡ Open Fast', command: 'smoothMove:angle=0;duration=100;servo=1', group: 'Servo 1' },
                  { id: 'servo1-closeFast', label: '⚡ Close Fast', command: 'smoothMove:angle=180;duration=100;servo=1', group: 'Servo 1' },
                ],
              },
            },
          ],
        },
      ];

      const projectIdValue = id();

      db.transact(
        db.tx.projects[projectIdValue].update({
          name: projectName.trim(),
          mqttConfig: defaultMqttConfig,
          controlSets: defaultControlSets,
          userId: user.id,
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
          <h1 className="retro-title mb-4">Projects</h1>
          <div className="border-t border-green-500 mb-4"></div>
          <div className="text-sm text-red-400">Auth error: {error.message}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="retro-title mb-4">Projects</h1>
          <div className="border-t border-green-500 mb-4"></div>
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
        <h1 className="retro-title mb-4">Projects</h1>
        <div className="border-t border-green-500 mb-4"></div>

        <div className="mb-4">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs px-2 py-1 mb-2"
          >
            {showCreateForm ? 'CANCEL' : '+ CREATE PROJECT'}
          </button>

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
        </div>

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
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-xs px-2 py-1"
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

