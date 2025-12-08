import axios from 'axios';
import type { Project, ProjectCreate, Task, TaskCreate, EVMMetrics, EVMSnapshot, EVMAnalysis, Member, MemberWithUtilization, MemberCreate } from '../types';

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
    // 日付文字列をISO 8601形式に変換するヘルパー
    const toDateTime = (dateStr: string | undefined): string | undefined => {
      if (!dateStr) return undefined;
      return `${dateStr}T00:00:00`;
    };

    const cleanedTask: Record<string, unknown> = {
      name: task.name,
      project_id: task.project_id,
      parent_id: task.parent_id,
      assigned_member_id: task.assigned_member_id,
      description: task.description,
      planned_hours: task.planned_hours,
      actual_hours: task.actual_hours,
      hourly_rate: task.hourly_rate,
    };
    // 日付フィールドは空でなければISO形式で追加
    if (task.planned_start_date) cleanedTask.planned_start_date = toDateTime(task.planned_start_date);
    if (task.planned_end_date) cleanedTask.planned_end_date = toDateTime(task.planned_end_date);
    if (task.actual_start_date) cleanedTask.actual_start_date = toDateTime(task.actual_start_date);
    if (task.actual_end_date) cleanedTask.actual_end_date = toDateTime(task.actual_end_date);

    const { data } = await api.post('/tasks/', cleanedTask);
    return data;
  },

  update: async (id: number, task: Partial<TaskCreate & { actual_hours?: number; progress?: number }>): Promise<Task> => {
    // 日付文字列をISO 8601形式に変換するヘルパー
    const toDateTime = (dateStr: string | undefined | null): string | undefined => {
      if (!dateStr) return undefined;
      // すでにISO形式の場合はそのまま返す
      if (dateStr.includes('T')) return dateStr;
      return `${dateStr}T00:00:00`;
    };

    const cleanedTask: Record<string, unknown> = {};

    // 非日付フィールド
    if (task.name !== undefined) cleanedTask.name = task.name;
    if (task.description !== undefined) cleanedTask.description = task.description;
    if (task.planned_hours !== undefined) cleanedTask.planned_hours = task.planned_hours;
    if (task.actual_hours !== undefined) cleanedTask.actual_hours = task.actual_hours;
    if (task.hourly_rate !== undefined) cleanedTask.hourly_rate = task.hourly_rate;
    if (task.progress !== undefined) cleanedTask.progress = task.progress;
    if (task.parent_id !== undefined) cleanedTask.parent_id = task.parent_id;
    if (task.assigned_member_id !== undefined) cleanedTask.assigned_member_id = task.assigned_member_id;

    // 日付フィールドは空でなければISO形式で追加
    if (task.planned_start_date) cleanedTask.planned_start_date = toDateTime(task.planned_start_date);
    if (task.planned_end_date) cleanedTask.planned_end_date = toDateTime(task.planned_end_date);
    if (task.actual_start_date) cleanedTask.actual_start_date = toDateTime(task.actual_start_date);
    if (task.actual_end_date) cleanedTask.actual_end_date = toDateTime(task.actual_end_date);

    const { data } = await api.put(`/tasks/${id}`, cleanedTask);
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

// メンバーAPI
export const membersApi = {
  getByProject: async (projectId: number): Promise<MemberWithUtilization[]> => {
    const { data } = await api.get(`/members/project/${projectId}`);
    return data;
  },

  getById: async (id: number): Promise<Member> => {
    const { data } = await api.get(`/members/${id}`);
    return data;
  },

  create: async (member: MemberCreate): Promise<Member> => {
    const { data } = await api.post('/members/', member);
    return data;
  },

  update: async (id: number, member: Partial<MemberCreate>): Promise<Member> => {
    const { data } = await api.put(`/members/${id}`, member);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/members/${id}`);
  },
};
