import axios from 'axios';
import type { Project, ProjectCreate, Task, TaskCreate, EVMMetrics, EVMSnapshot, EVMAnalysis } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// プロジェクトAPI
export const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    const { data } = await api.get('/projects/');
    return data;
  },

  getById: async (id: number): Promise<Project> => {
    const { data } = await api.get(`/projects/${id}`);
    return data;
  },

  create: async (project: ProjectCreate): Promise<Project> => {
    const { data } = await api.post('/projects/', project);
    return data;
  },

  update: async (id: number, project: Partial<ProjectCreate>): Promise<Project> => {
    const { data } = await api.put(`/projects/${id}`, project);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

// タスクAPI
export const tasksApi = {
  getByProject: async (projectId: number): Promise<Task[]> => {
    const { data } = await api.get(`/tasks/project/${projectId}`);
    return data;
  },

  getById: async (id: number): Promise<Task> => {
    const { data } = await api.get(`/tasks/${id}`);
    return data;
  },

  create: async (task: TaskCreate): Promise<Task> => {
    const { data } = await api.post('/tasks/', task);
    return data;
  },

  update: async (id: number, task: Partial<TaskCreate & { actual_hours?: number; progress?: number }>): Promise<Task> => {
    const { data } = await api.put(`/tasks/${id}`, task);
    return data;
  },

  updateProgress: async (id: number, progress: number): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${id}/progress?progress=${progress}`);
    return data.task;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};

// EVM API
export const evmApi = {
  getMetrics: async (projectId: number): Promise<EVMMetrics> => {
    const { data } = await api.get(`/evm/projects/${projectId}/metrics`);
    return data;
  },

  createSnapshot: async (projectId: number): Promise<EVMSnapshot> => {
    const { data } = await api.post(`/evm/projects/${projectId}/snapshots`);
    return data;
  },

  getSnapshots: async (projectId: number): Promise<EVMSnapshot[]> => {
    const { data } = await api.get(`/evm/projects/${projectId}/snapshots`);
    return data;
  },

  getAnalysis: async (projectId: number): Promise<EVMAnalysis> => {
    const { data } = await api.get(`/evm/projects/${projectId}/analysis`);
    return data;
  },
};
