// HR 관련 타입 정의

export interface AttendanceStats {
  period: { type: string; start: string; end: string }
  monthly: {
    totalWorkDays: number
    presentDays: number
    lateDays: number
    absentDays: number
    halfDays: number
    remoteDays: number
    officeDays: number
    attendanceRate: number
    avgWorkHours: number
    totalWorkHours: number
  }
  weekly: {
    pattern: { day: string; hours: number }[]
  }
  yearly: {
    totalDays: number
    attendanceRate: number
    avgWorkHours: number
    lateDays: number
  }
  workTypeDistribution: {
    office: number
    remote: number
    present: number
    late: number
  }
}

export interface WorkSettings {
  type: 'FIXED' | 'FLEXIBLE' | 'CORE_TIME'
  dailyRequiredMinutes: number
  workStartTime: string
  workEndTime: string
  coreTimeStart: string
  coreTimeEnd: string
  presenceCheckEnabled: boolean
  presenceIntervalMinutes: number
  officeIpWhitelist: string[]
}

export interface EmployeeProfile {
  id?: string
  nameKor: string
  nameEng?: string
  email: string
  phone?: string
  mobile?: string
  birthDate?: string
  gender?: 'male' | 'female'
  profileImage?: string
  address?: string
  addressDetail?: string
  employeeNumber?: string
  department?: string
  position?: string
  jobTitle?: string
  hireDate?: string
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
  status?: 'ACTIVE' | 'ONBOARDING' | 'ON_LEAVE' | 'TERMINATED'
  education?: EmployeeEducation[]
  experience?: EmployeeExperience[]
  certificates?: EmployeeCertificate[]
  bankName?: string
  accountNumber?: string
  accountHolder?: string
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
  taxExemption?: boolean
  dependents?: number
}

export interface EmployeeEducation {
  id?: string
  school: string
  degree: string
  major: string
  graduationDate?: string
  status: 'graduated' | 'enrolled' | 'dropout'
}

export interface EmployeeExperience {
  id?: string
  company: string
  position: string
  startDate: string
  endDate?: string
  description?: string
}

export interface EmployeeCertificate {
  id?: string
  name: string
  issuer: string
  issueDate: string
  expiryDate?: string
}

export interface PayrollInfo {
  payrollType: 'MONTHLY' | 'HOURLY' | 'FREELANCER'
  baseSalaryMonthly?: number
  hourlyWage?: number
  contractType?: string
  workingHoursPerWeek?: number
  allowances?: PayrollAllowance[]
  deductions?: PayrollDeduction[]
  payslips?: PayslipSummary[]
}

export interface PayrollAllowance {
  id?: string
  name: string
  amount: number
  type: 'fixed' | 'variable'
}

export interface PayrollDeduction {
  id?: string
  name: string
  amount: number
  type: 'rate' | 'fixed'
}

export interface PayslipSummary {
  id?: string
  period: string
  periodStart?: Date
  periodEnd?: Date
  basePay?: number
  grossPay: number
  totalDeduction?: number
  netPay: number
  status: 'draft' | 'confirmed' | 'paid' | 'DRAFT' | 'CONFIRMED' | 'PAID'
}

export interface LeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  days?: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  createdAt: string
}

// 관리자용 휴가 신청 정보 (신청자 정보 포함)
export interface LeaveRequestWithEmployee extends LeaveRequest {
  employee: {
    id: string
    name: string
    department?: string
    position?: string
    profileImage?: string
  }
}

export interface LeaveBalance {
  annualTotal: number
  annualUsed: number
  annualRemaining: number
  sickTotal: number
  sickUsed: number
  sickRemaining: number
}

export type HRTab = 'attendance' | 'flexible' | 'profile' | 'payroll' | 'leave' | 'stats' | 'export' | 'settings'
export type UserRole = 'admin' | 'hr' | 'manager' | 'employee'

// ============================================
// job.md 알고리즘 기반 설정 타입 정의
// ============================================

// 퀵설정 모드 관련
export type WorkType = 'FIXED' | 'FLEXIBLE' | 'AUTONOMOUS'
export type PayrollType = 'MONTHLY' | 'HOURLY' | 'FREELANCER'
export type ContractType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'HOURLY'

// 3.1 퀵설정 질문 흐름 기반
export interface QuickSetupConfig {
  step: number
  country: 'KR' | 'US' | 'JP' | 'OTHER'
  workType: WorkType
  remoteWorkEnabled: boolean
  gpsVerification: boolean
  wifiVerification: boolean
  hourlyWorkerEnabled: boolean
  leavePolicy: 'LEGAL_STANDARD' | 'CUSTOM'
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE'
}

// 고급 모드 설정
export interface AdvancedWorkSettings {
  // 근무 시간 설정
  workSchedule: {
    type: WorkType
    dailyRequiredMinutes: number
    weeklyRequiredHours: number
    workStartTime: string  // HH:mm
    workEndTime: string    // HH:mm
    coreTimeStart?: string // 유연근무시 필수 근무시간 시작
    coreTimeEnd?: string   // 유연근무시 필수 근무시간 종료
    lunchBreakMinutes: number
    lunchBreakStart: string
    lunchBreakEnd: string
  }

  // 근태 인증 설정
  verification: {
    presenceCheckEnabled: boolean
    presenceIntervalMinutes: number
    gpsEnabled: boolean
    gpsRadius: number  // meters
    wifiEnabled: boolean
    wifiRequired?: boolean  // WiFi 검증 필수 여부
    officeIpWhitelist: string[]
    officeWifiSSIDs: string[]
    allowFlexibleWork?: boolean  // 유연근무 허용
    allowRemoteWork?: boolean    // 재택근무 허용
  }

  // 지각/조퇴 규정
  latePolicy: {
    graceMinutes: number  // 지각 유예 시간
    deductionPerLate: number  // 지각 1회당 공제액
    maxLatePerMonth: number
  }
}

// 급여 계산 엔진 설정 (5.2 급여 계산 공식 기반)
export interface PayrollEngineSettings {
  // 기본 급여 설정
  baseSalary: {
    type: PayrollType
    monthlyAmount?: number
    hourlyRate?: number
    standardWorkingHoursPerMonth: number  // 소정근로시간 (통상 209시간)
  }

  // 수당 가산율 (근로기준법 기준)
  overtimeMultipliers: {
    overtime: number      // 연장근로 (기본 1.5)
    night: number         // 야간근로 22:00-06:00 (기본 1.5)
    holiday: number       // 휴일근로 (기본 1.5)
    holidayOvertime: number  // 휴일연장 (기본 2.0)
  }

  // 고정 수당
  fixedAllowances: {
    id: string
    name: string
    amount: number
    taxable: boolean
    description?: string
  }[]

  // 공제 항목
  deductions: {
    id: string
    name: string
    type: 'RATE' | 'FIXED'
    value: number  // rate면 0.09 (9%), fixed면 금액
    description?: string
  }[]
}

// 연차 정책 설정
export interface LeavePolicySettings {
  // 연차 발생 기준
  annualLeave: {
    type: 'LEGAL_STANDARD' | 'CUSTOM'
    firstYearDays: number      // 입사 1년 미만 (법정: 월 1일)
    afterFirstYearDays: number // 입사 1년 이상 (법정: 15일)
    maxAccumulatedDays: number
    carryOverEnabled: boolean
    carryOverMaxDays: number
    expiryMonths: number  // 이월 시 만료 기간
  }

  // 병가/특별휴가
  sickLeave: {
    paidDays: number
    requiresDocument: boolean
    documentAfterDays: number
  }

  specialLeave: {
    marriage: number
    bereavement: number
    childBirth: number
    familyCare: number
  }

  // 휴가 승인 프로세스
  approvalProcess: {
    autoApproveUnder: number  // N일 이하 자동승인
    requireManagerApproval: boolean
    requireHRApproval: boolean
  }
}

// 권한 설정 (7. RBAC 기반)
export interface RBACSettings {
  roles: {
    id: string
    name: string
    nameKor: string
    permissions: RBACPermission[]
  }[]
}

export interface RBACPermission {
  module: 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'HR_RECORD' | 'SETTINGS' | 'APPROVAL'
  actions: ('VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'APPROVE')[]
}

// 전체 HR 설정 통합
export interface HRSystemSettings {
  id?: string
  workspaceId: string

  // 설정 모드
  setupMode: 'QUICK' | 'ADVANCED'
  quickSetup?: QuickSetupConfig

  // 상세 설정
  workSettings: AdvancedWorkSettings
  payrollSettings: PayrollEngineSettings
  leavePolicy: LeavePolicySettings
  rbacSettings: RBACSettings

  // 정책 버전 관리
  policyVersion: string
  policyStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ARCHIVED'
  effectiveFrom: string
  approvedBy?: string
  approvedAt?: string

  createdAt: string
  updatedAt: string
}
