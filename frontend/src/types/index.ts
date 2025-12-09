// プロジェクトステータス
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

// タスク種別（フェーズ）
export const TASK_TYPES = {
  requirements: '要件定義',
  external_design: '外部設計',
  detailed_design: '詳細設計',
  pg: 'PG',
  ut: 'UT',
  ci: 'CI',
  it: 'IT',
  st: 'ST',
  release: '本番化',
} as const;

export type TaskType = keyof typeof TASK_TYPES;

// プロジェクト
export interface Project {
  id: number;
  name: string;
  description?: string;
  start_date?: string;  // タスクから自動計算
  end_date?: string;    // タスクから自動計算
  budget: number;       // タスクの計画工数合計
  status: ProjectStatus;
  manager_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
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

export interface MemberEVM {
  id: number;
  name: string;
  task_count: number;
  bac: number;  // Budget at Completion
  pv: number;   // Planned Value
  ev: number;   // Earned Value
  ac: number;   // Actual Cost
  sv: number;   // Schedule Variance
  cv: number;   // Cost Variance
  spi: number;  // Schedule Performance Index
  cpi: number;  // Cost Performance Index
  etc: number;  // Estimate to Complete
  eac: number;  // Estimate at Completion
}

export interface MemberWithSkills extends Member {
  skills: TaskType[];
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
  is_milestone: boolean;  // 固定日付タスク（リスケジュール対象外）
  task_type?: TaskType;   // タスク種別（フェーズ）
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
  hourly_rate?: number;
  is_milestone?: boolean;  // 固定日付タスク
  task_type?: TaskType;    // タスク種別（フェーズ）
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

// 休日タイプ
export type HolidayType = 'weekend' | 'national' | 'company' | 'custom';

// 休日
export interface Holiday {
  id: number;
  project_id: number;
  date: string;
  name: string;
  holiday_type: HolidayType;
}

export interface HolidayCreate {
  project_id: number;
  date: string;
  name: string;
  holiday_type?: HolidayType;
}

export interface HolidayImportItem {
  date: string;
  name: string;
  holiday_type?: HolidayType;
}

export interface HolidayGenerateRequest {
  start_date: string;
  end_date: string;
  include_weekends: boolean;
  include_national_holidays: boolean;
}

export interface WorkingDaysInfo {
  start_date: string;
  end_date: string;
  total_days: number;
  holiday_count: number;
  working_days: number;
}

// リスケジュール関連
export interface ReschedulePreviewTask {
  id: number;
  name: string;
  current_start?: string;
  current_end?: string;
  new_start?: string;
  new_end?: string;
  is_child: boolean;
  parent_id?: number;
}

export interface ReschedulePreviewResponse {
  base_task_name: string;
  shift_days: number;
  affected_tasks: ReschedulePreviewTask[];
  total_count: number;
}

export interface RescheduleUpdatedTask {
  id: number;
  name: string;
  new_start?: string;
  new_end?: string;
  parent_id?: number;
}

export interface RescheduleResponse {
  message: string;
  updated_count: number;
  updated_tasks: RescheduleUpdatedTask[];
}

// 自動スケジュール関連
export interface AutoSchedulePreviewTask {
  id: number;
  name: string;
  task_type?: string;
  planned_hours: number;
  calculated_days: number;
  current_member_id?: number;
  current_member_name?: string;
  new_member_id?: number;
  new_member_name?: string;
  new_start?: string;
  new_end?: string;
}

export interface AutoSchedulePreviewResponse {
  start_date: string;
  tasks: AutoSchedulePreviewTask[];
  total_count: number;
  warnings: string[];
}

export interface AutoScheduleResponse {
  message: string;
  updated_count: number;
  updated_tasks: AutoSchedulePreviewTask[];
}

// 日毎稼働率
export interface DailyUtilization {
  date: string;  // YYYY-MM-DD
  hours: number;  // その日のアサイン時間
  utilization_rate: number;  // 稼働率（%）
}

// 週毎稼働率
export interface WeeklyUtilization {
  week_start: string;  // 週の開始日（月曜日）YYYY-MM-DD
  week_end: string;  // 週の終了日（日曜日）YYYY-MM-DD
  hours: number;  // その週のアサイン時間
  available_hours: number;  // 週あたり稼働可能時間
  utilization_rate: number;  // 稼働率（%）
}

// メンバー稼働率詳細
export interface MemberUtilizationDetail {
  member_id: number;
  member_name: string;
  available_hours_per_week: number;
  available_hours_per_day: number;  // 1日あたりの稼働可能時間
  daily: DailyUtilization[];
  weekly: WeeklyUtilization[];
}
