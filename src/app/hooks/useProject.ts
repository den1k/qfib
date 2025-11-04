'use client';

import { useState, useEffect, useCallback } from 'react';
import { getInstantDB } from '@/app/utils/instantdb';

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
  public?: boolean;
  createdAt: number;
  updatedAt: number;
}

const ACTIVE_PROJECT_KEY = 'fible-active-project';

export function useProject(projectId?: string) {
  const { user } = db?.useAuth() || { user: null };
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const queryResult = db?.useQuery({
    projects: projectId
      ? {
          $: {
            where: { id: projectId },
          },
        }
      : undefined,
  });
  const { data } = queryResult || { data: null };
  const rawProject = projectId && data?.projects ? data.projects[0] : null;

  const project: Project | null = rawProject
    ? {
        id: rawProject.id,
        name: (rawProject.name as string) || '',
        mqttConfig: (rawProject.mqttConfig as MQTTConfig | undefined) || {
          brokerUrl: '',
          username: '',
          password: '',
          commandTopic: 'fible/command',
          statusTopic: 'fible/status',
          clientId: '',
        },
        controlSets: (rawProject.controlSets as ControlSet[]) || [],
        userId: (rawProject.userId as string) || '',
        public: (rawProject.public as boolean | undefined) ?? false,
        createdAt: (rawProject.createdAt as number) || 0,
        updatedAt: (rawProject.updatedAt as number) || 0,
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
    updateMqttConfig,
    activeProjectId,
    setActiveProjectId,
  };
}

