// プロジェクトステータス
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

// プロジェクト
export interface Project {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget: number;
  status: ProjectStatus;
  manager_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget: number;
  status?: ProjectStatus;
  manager_id?: number;
}

// メンバー
export interface Member {
  id: number;
  project_id: number;
  name: string;
  available_hours_per_week: number;
  created_at: string;
  updated_at?: string;
}

export interface MemberWithUtilization extends Member {
  assigned_hours: number;
  utilization_rate: number;
}

export interface MemberCreate {
  project_id: number;
  name: string;
  available_hours_per_week?: number;
}

// タスク
export interface Task {
  id: number;
  project_id: number;
  parent_id?: number;
  assigned_member_id?: number;
  name: string;
  description?: string;
  planned_hours: number;
  actual_hours: number;
  progress: number;
  hourly_rate: number;
  // 予定スケジュール
  planned_start_date?: string;
  planned_end_date?: string;
  // 実績スケジュール
  actual_start_date?: string;
  actual_end_date?: string;
  created_at: string;
  updated_at?: string;
  children?: Task[];
}

export interface TaskCreate {
  project_id: number;
  parent_id?: number;
  assigned_member_id?: number;
  name: string;
  description?: string;
  planned_hours: number;
  actual_hours?: number;
  hourly_rate: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
}

// EVM指標
export interface EVMMetrics {
  date: string;
  pv: number;  // Planned Value
  ev: number;  // Earned Value
  ac: number;  // Actual Cost
  sv: number;  // Schedule Variance
  cv: number;  // Cost Variance
  spi: number; // Schedule Performance Index
  cpi: number; // Cost Performance Index
  bac: number; // Budget at Completion
  etc: number; // Estimate to Complete
  eac: number; // Estimate at Completion
}

export interface EVMSnapshot {
  id: number;
  project_id: number;
  date: string;
  pv: number;
  ev: number;
  ac: number;
  sv: number;
  cv: number;
  spi: number;
  cpi: number;
  eac?: number;
  etc?: number;
  created_at: string;
}

export interface EVMAnalysis {
  metrics: EVMMetrics;
  schedule_status: {
    status: 'on_track' | 'warning' | 'critical';
    message: string;
  };
  cost_status: {
    status: 'on_track' | 'warning' | 'critical';
    message: string;
  };
  recommendations: string[];
}
