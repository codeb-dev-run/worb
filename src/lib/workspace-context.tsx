'use client'
// =============================================================================
// Workspace Context - CVE-CB-005 Fixed: Development-only Logging
// Issue #4: 로그인 후 워크스페이스 리다이렉트 타이밍 문제 수정
// =============================================================================

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { getWorkspaces, getWorkspaceFeatures } from '@/actions/workspace'

// 부서(팀) 타입
export interface Department {
    id: string
    name: string
    color: string
    order: number
    memberCount?: number
}

// 레거시 부서 키를 위한 기본 색상/이름 매핑 (기존 Mock 데이터 호환)
export const LEGACY_DEPARTMENT_MAP: Record<string, { name: string; color: string }> = {
    development: { name: '개발팀', color: '#3B82F6' },
    design: { name: '디자인팀', color: '#EC4899' },
    planning: { name: '기획팀', color: '#8B5CF6' },
    operations: { name: '운영팀', color: '#10B981' },
    marketing: { name: '마케팅팀', color: '#F59E0B' },
    hr: { name: '인사팀', color: '#6366F1' },
}

const isDev = process.env.NODE_ENV === 'development'

// 워크스페이스 생성/초대 페이지에서는 리다이렉트하지 않음
const EXCLUDED_PATHS = ['/workspace/create', '/login', '/register', '/forgot-password', '/invite', '/workspaces/join']

interface WorkspaceFeatures {
    id: string
    workspaceId: string
    // 프로젝트 관리 기능
    projectEnabled: boolean
    kanbanEnabled: boolean
    ganttEnabled: boolean
    mindmapEnabled: boolean
    filesEnabled: boolean
    // HR 기능
    attendanceEnabled: boolean
    employeeEnabled: boolean
    payrollEnabled: boolean
    payslipEnabled: boolean
    leaveEnabled: boolean
    hrEnabled: boolean
    organizationEnabled: boolean
    // 재무 기능
    financeEnabled: boolean
    expenseEnabled: boolean
    invoiceEnabled: boolean
    corporateCardEnabled: boolean
    // 고급 기능
    resumeParsingEnabled: boolean
    approvalEnabled: boolean
    marketingEnabled: boolean
    automationEnabled: boolean
    logsEnabled: boolean
    // 그룹웨어 기능
    announcementEnabled: boolean
    boardEnabled: boolean
    calendarEnabled: boolean
    messageEnabled: boolean
    chatEnabled: boolean
}

interface Workspace {
    id: string
    name: string
    domain: string | null
    plan: string
    type?: 'ENTERPRISE' | 'HR_ONLY' | 'PROJECT_ONLY'
    features?: WorkspaceFeatures | null
    userRole?: 'admin' | 'member' // 현재 사용자의 워크스페이스 내 역할
}

interface WorkspaceContextType {
    currentWorkspace: Workspace | null
    workspaces: Workspace[]
    loading: boolean
    features: WorkspaceFeatures | null
    departments: Department[] // 부서(팀) 목록
    currentRole: 'admin' | 'member' // 현재 워크스페이스에서의 역할
    isAdmin: boolean // 관리자 여부 헬퍼
    switchWorkspace: (workspaceId: string) => Promise<void>
    createWorkspace: (name: string, domain: string) => Promise<Workspace>
    refreshWorkspaces: () => Promise<void>
    refreshDepartments: () => Promise<void> // 부서 목록 새로고침
    isFeatureEnabled: (featureKey: keyof WorkspaceFeatures) => boolean
    getDepartmentColor: (departmentId?: string) => string // 부서 색상 조회
    getDepartmentName: (departmentId?: string) => string // 부서 이름 조회
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [features, setFeatures] = useState<WorkspaceFeatures | null>(null)
    const [departments, setDepartments] = useState<Department[]>([])
    const [loading, setLoading] = useState(true)
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { status: sessionStatus } = useSession()

    // 세션이 인증된 상태일 때만 워크스페이스 로드
    useEffect(() => {
        // 세션이 로딩 중이면 대기
        if (sessionStatus === 'loading') {
            if (isDev) console.log('[DEV] 세션 로딩 중...')
            return
        }

        // 세션이 인증되지 않은 상태면 로딩 완료 처리
        if (sessionStatus === 'unauthenticated') {
            if (isDev) console.log('[DEV] 세션 없음 - 워크스페이스 로드 건너뜀')
            setLoading(false)
            return
        }

        // 세션이 인증된 상태면 워크스페이스 로드
        if (sessionStatus === 'authenticated' && !hasAttemptedLoad) {
            if (isDev) console.log('[DEV] 세션 인증됨 - 워크스페이스 로드 시작')
            setHasAttemptedLoad(true)
            loadWorkspaces()
        }
    }, [sessionStatus, hasAttemptedLoad])

    // features 및 departments 로드 - currentWorkspace 변경 시
    useEffect(() => {
        if (currentWorkspace?.id) {
            loadFeatures(currentWorkspace.id)
            loadDepartments(currentWorkspace.id)
        }
    }, [currentWorkspace?.id])

    const loadFeatures = async (workspaceId: string) => {
        try {
            if (isDev) console.log('[DEV] 워크스페이스 기능 로드 중:', workspaceId)
            const data = await getWorkspaceFeatures(workspaceId)

            if (data) {
                if (isDev) {
                    console.log('[DEV] 기능 로드 완료:', data)
                    console.log('[DEV] 프로젝트 활성화:', data.projectEnabled)
                    console.log('[DEV] HR 활성화:', data.hrEnabled)
                }
                setFeatures(data as WorkspaceFeatures)
            } else {
                // features가 없으면 기본값 (모두 활성화)
                if (isDev) console.log('[DEV] 기능 설정 없음 - 기본값 사용')
                setFeatures(null)
            }
        } catch {
            // CVE-CB-005: 기능 로드 실패 시 조용히 처리
            if (isDev) console.log('[DEV] 기능 로드 실패')
            setFeatures(null)
        }
    }

    const isFeatureEnabled = (featureKey: keyof WorkspaceFeatures): boolean => {
        // features가 없으면 기본적으로 모두 활성화
        if (!features) return true
        // id, workspaceId 등 boolean이 아닌 필드는 true 반환
        if (featureKey === 'id' || featureKey === 'workspaceId') return true
        return features[featureKey] as boolean
    }

    // 부서(팀) 목록 로드
    const loadDepartments = async (workspaceId: string) => {
        try {
            if (isDev) console.log('[DEV] 부서 목록 로드 중:', workspaceId)
            const response = await fetch(`/api/workspace/${workspaceId}/teams`)

            if (!response.ok) {
                throw new Error('Failed to fetch departments')
            }

            const data = await response.json()
            if (isDev) console.log('[DEV] 부서 로드 완료:', data.length, '개')
            setDepartments(data)
        } catch {
            if (isDev) console.log('[DEV] 부서 로드 실패')
            setDepartments([])
        }
    }

    // 부서 목록 새로고침
    const refreshDepartments = async () => {
        if (currentWorkspace?.id) {
            await loadDepartments(currentWorkspace.id)
        }
    }

    // 부서 ID로 색상 조회 (레거시 문자열 키 fallback 포함)
    const getDepartmentColor = (departmentId?: string): string => {
        if (!departmentId) return '#94A3B8' // Default slate-400
        // 먼저 실제 부서 목록에서 찾기
        const dept = departments.find(d => d.id === departmentId)
        if (dept) return dept.color
        // 레거시 문자열 키 fallback (기존 Mock 데이터 호환)
        const legacyDept = LEGACY_DEPARTMENT_MAP[departmentId]
        if (legacyDept) return legacyDept.color
        return '#94A3B8'
    }

    // 부서 ID로 이름 조회 (레거시 문자열 키 fallback 포함)
    const getDepartmentName = (departmentId?: string): string => {
        if (!departmentId) return '미지정'
        // 먼저 실제 부서 목록에서 찾기
        const dept = departments.find(d => d.id === departmentId)
        if (dept) return dept.name
        // 레거시 문자열 키 fallback (기존 Mock 데이터 호환)
        const legacyDept = LEGACY_DEPARTMENT_MAP[departmentId]
        if (legacyDept) return legacyDept.name
        return '미지정'
    }

    const loadWorkspaces = async (retryCount = 0) => {
        const MAX_RETRIES = 2
        const RETRY_DELAY = 500

        try {
            if (isDev) console.log('[DEV] 워크스페이스 로드 중...')
            const data = await getWorkspaces()

            if (isDev) console.log('[DEV] 로드된 워크스페이스 수:', data.length)

            // 저장된 워크스페이스 ID 가져오기
            const savedWorkspaceId = localStorage.getItem('currentWorkspaceId')
            if (isDev) console.log('[DEV] 저장된 워크스페이스 ID:', savedWorkspaceId)

            // 서버에서 빈 배열 반환 + localStorage에 저장된 ID가 있으면 재시도
            if (data.length === 0 && savedWorkspaceId && retryCount < MAX_RETRIES) {
                if (isDev) console.log(`[DEV] 워크스페이스 목록 비어있음 - 재시도 (${retryCount + 1}/${MAX_RETRIES})`)
                setTimeout(() => loadWorkspaces(retryCount + 1), RETRY_DELAY)
                return
            }

            // 워크스페이스 목록 설정
            setWorkspaces(data as unknown as Workspace[])

            if (savedWorkspaceId && data.find((w: any) => w.id === savedWorkspaceId)) {
                // 저장된 워크스페이스가 목록에 있으면 사용
                const workspace = data.find((w: any) => w.id === savedWorkspaceId)
                if (isDev) console.log('[DEV] 저장된 워크스페이스 사용')
                setCurrentWorkspace(workspace as unknown as Workspace)
            } else if (data.length > 0) {
                // 저장된 ID가 없거나 유효하지 않으면 첫 번째 워크스페이스 사용
                if (isDev) console.log('[DEV] 첫 번째 워크스페이스 사용')
                setCurrentWorkspace(data[0] as unknown as Workspace)
                localStorage.setItem('currentWorkspaceId', data[0].id)
            } else {
                // 워크스페이스가 하나도 없는 경우
                if (isDev) console.log('[DEV] 워크스페이스 없음')

                // 제외된 경로에서는 리다이렉트하지 않음
                const isExcludedPath = EXCLUDED_PATHS.some(path => pathname?.startsWith(path))
                if (!isExcludedPath) {
                    if (isDev) console.log('[DEV] 워크스페이스 생성 페이지로 이동')
                    router.push('/workspace/create')
                }
            }
        } catch (error) {
            // CVE-CB-005: 에러 발생 시 개발 환경에서만 로깅
            if (isDev) console.log('[DEV] 워크스페이스 로드 실패', error)

            // 에러 발생 시에도 localStorage에 저장된 ID가 있으면 재시도
            const savedWorkspaceId = localStorage.getItem('currentWorkspaceId')
            if (savedWorkspaceId && retryCount < MAX_RETRIES) {
                if (isDev) console.log(`[DEV] 에러 후 재시도 (${retryCount + 1}/${MAX_RETRIES})`)
                setTimeout(() => loadWorkspaces(retryCount + 1), RETRY_DELAY)
                return
            }

            toast.error('워크스페이스를 불러오는데 실패했습니다')
        }

        // 로딩 완료 처리 (재시도 중에는 return으로 빠져나감)
        if (isDev) console.log('[DEV] 로딩 완료')
        setLoading(false)
    }

    const switchWorkspace = async (workspaceId: string) => {
        const workspace = workspaces.find(w => w.id === workspaceId)
        if (!workspace) {
            toast.error('워크스페이스를 찾을 수 없습니다')
            return
        }

        setCurrentWorkspace(workspace)
        localStorage.setItem('currentWorkspaceId', workspaceId)
        toast.success(`${workspace.name}(으)로 전환했습니다`)

        // 페이지 새로고침하여 데이터 갱신
        router.refresh()
    }

    const createWorkspace = async (name: string, domain: string): Promise<Workspace> => {
        try {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, domain }),
            })

            if (!response.ok) throw new Error('Failed to create workspace')

            const workspace = await response.json()
            setWorkspaces([...workspaces, workspace])
            setCurrentWorkspace(workspace)
            localStorage.setItem('currentWorkspaceId', workspace.id)

            toast.success('워크스페이스가 생성되었습니다')
            return workspace
        } catch (error) {
            // CVE-CB-005: 개발 환경에서만 에러 로깅
            if (isDev) console.log('[DEV] 워크스페이스 생성 실패')
            toast.error('워크스페이스 생성에 실패했습니다')
            throw error
        }
    }

    const refreshWorkspaces = async () => {
        setHasAttemptedLoad(false)
        await loadWorkspaces()
    }

    // 현재 워크스페이스에서의 역할
    const currentRole = currentWorkspace?.userRole || 'member'
    const isAdmin = currentRole === 'admin'

    const value = {
        currentWorkspace,
        workspaces,
        loading,
        features,
        departments,
        currentRole,
        isAdmin,
        switchWorkspace,
        createWorkspace,
        refreshWorkspaces,
        refreshDepartments,
        isFeatureEnabled,
        getDepartmentColor,
        getDepartmentName,
    }

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext)
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider')
    }
    return context
}

export type { Workspace, WorkspaceFeatures }
