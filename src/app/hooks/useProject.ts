'use client';

import { useState, useEffect, useCallback } from 'react';
import { getInstantDB } from '@/app/utils/instantdb';
import { FormSchema } from '@/types/formSchema';

const db = getInstantDB();

export interface MQTTConfig {
  brokerUrl: string;
  username: string;
  password: string;
  commandTopic: string;
  statusTopic: string;
  clientId: string;
}

import { ControlSet } from '@/types/controlSet';

export interface Project {
  id: string;
  name: string;
  mqttConfig: MQTTConfig;
  controlSets: ControlSet[];
  userId: string;
  createdAt: number;
  updatedAt: number;
}

const ACTIVE_PROJECT_KEY = 'fible-active-project';

export function useProject(projectId?: string) {
  const { user } = db?.useAuth() || { user: null };
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Query the specific project if projectId is provided
  const { data } = db?.useQuery({
    projects: projectId
      ? {
          $: {
            where: { id: projectId },
          },
        }
      : undefined,
  }) || { data: null };

  const rawProject = projectId && data?.projects ? data.projects[0] : null;
  const project: Project | null = rawProject
    ? {
        id: rawProject.id,
        name: rawProject.name || '',
        mqttConfig: rawProject.mqttConfig || {
          brokerUrl: '',
          username: '',
          password: '',
          commandTopic: 'fible/command',
          statusTopic: 'fible/status',
          clientId: '',
        },
        controlSets: rawProject.controlSets || [],
        userId: rawProject.userId || '',
        createdAt: rawProject.createdAt || 0,
        updatedAt: rawProject.updatedAt || 0,
      }
    : null;

  // Load active project from localStorage
  useEffect(() => {
    if (!projectId) {
      const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (saved) {
        setActiveProjectId(saved);
      }
    }
  }, [projectId]);

  const updateProject = useCallback(
    async (updates: Partial<Project>) => {
      if (!db || !projectId) return;

      try {
        const currentProject = data?.projects?.[0];
        if (!currentProject) return;

        db.transact(
          db.tx.projects[projectId].update({
            ...updates,
            updatedAt: Date.now(),
          })
        );
      } catch (err) {
        console.error('Failed to update project:', err);
        throw err;
      }
    },
    [db, projectId, data]
  );

  const updateControlSets = useCallback(
    async (controlSets: ControlSet[]) => {
      await updateProject({ controlSets });
    },
    [updateProject]
  );

  const updateSchemas = useCallback(
    async (schemas: FormSchema[]) => {
      await updateProject({ schemas });
    },
    [updateProject]
  );

  const updateMqttConfig = useCallback(
    async (mqttConfig: MQTTConfig) => {
      await updateProject({ mqttConfig });
    },
    [updateProject]
  );

  return {
    project,
    updateProject,
    updateControlSets,
    updateSchemas,
    updateMqttConfig,
    activeProjectId,
    setActiveProjectId,
  };
}

