import { GoogleGenerativeAI } from '@google/generative-ai'
import { TaskStatus, TaskPriority } from '@/types/task'
import { prisma } from '@/lib/prisma'

interface ProjectData {
  id: string
  name: string
  description: string | null
  status: string
  progress: number
  startDate: Date | null
  endDate: Date | null
  budget: number | null
  team: { name: string; role: string }[]
  tasks: any[]
}

export interface AIAnalysis {
  quality: number
  budgetUsage: number
  efficiency: number
  satisfaction: number
  predictions: {
    successProbability: number
    completionDate: string
    budgetForecast: number
  }
  risks: string[]
  recommendations: string[]

  // 상세 메트릭 (Optional for now as schema might not have them all detailed)
  qualityMetrics?: {
    bugCount: number
    codeReviewPassRate: number
    testCoverage: number
  }
  budgetMetrics?: {
    totalBudget: number
    budgetUsed: number
    burnRate: number
  }
  efficiencyMetrics?: {
    velocity: number
    onTimeDeliveryRate: number
    avgTaskCompletionTime: number
  }
}

export class AIService {
  private genAI: GoogleGenerativeAI
  private model: any

  private context: {
    userRole?: string
    currentPage?: string
    projectId?: string
  } = {}

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' })
  }

  setContext(context: { userRole?: string; currentPage?: string }) {
    this.context = {
      ...this.context,
      ...context
    }

    // Extract project ID from URL if present
    if (context.currentPage && context.currentPage.includes('/projects/')) {
      const parts = context.currentPage.split('/')
      const projectIndex = parts.indexOf('projects')
      if (projectIndex !== -1 && parts[projectIndex + 1]) {
        this.context.projectId = parts[projectIndex + 1]
      }
    }
  }

  async processMessage(message: string): Promise<string> {
    if (this.context.projectId) {
      return this.generateChatResponse(message, this.context.projectId)
    }

    // General chat without project context
    try {
      const prompt = `
당신은 프로젝트 관리 AI 어시스턴트입니다.
사용자의 질문에 친절하게 답변해주세요.
사용자 역할: ${this.context.userRole || '알 수 없음'}

사용자 질문: ${message}
`
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Error processing message:', error)
      return '죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다.'
    }
  }

  private getDefaultAnalysis(): AIAnalysis {
    return {
      quality: 0,
      budgetUsage: 0,
      efficiency: 0,
      satisfaction: 0,
      predictions: {
        successProbability: 0,
        completionDate: new Date().toISOString(),
        budgetForecast: 0
      },
      risks: [],
      recommendations: [],
      qualityMetrics: {
        bugCount: 0,
        codeReviewPassRate: 0,
        testCoverage: 0
      },
      budgetMetrics: {
        totalBudget: 0,
        budgetUsed: 0,
        burnRate: 0
      },
      efficiencyMetrics: {
        velocity: 0,
        onTimeDeliveryRate: 0,
        avgTaskCompletionTime: 0
      }
    }
  }

  async analyzeProject(projectId: string): Promise<AIAnalysis> {
    try {
      const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: true,
          members: {
            include: {
              user: true
            }
          },
          aiMetrics: true
        }
      })

      if (!projectData) {
        return this.getDefaultAnalysis()
      }

      const aiMetrics = projectData.aiMetrics

      if (!aiMetrics) {
        return this.getDefaultAnalysis()
      }

      // Parse JSON fields safely
      const predictions = typeof aiMetrics.predictions === 'object' ? aiMetrics.predictions as any : {
        successProbability: 0,
        completionDate: new Date().toISOString(),
        budgetForecast: 0
      }

      const risks = Array.isArray(aiMetrics.risks) ? aiMetrics.risks as string[] : []

      return {
        quality: aiMetrics.quality,
        budgetUsage: aiMetrics.budgetUsage,
        efficiency: aiMetrics.efficiency,
        satisfaction: aiMetrics.satisfaction,
        predictions: {
          successProbability: predictions.successProbability || 0,
          completionDate: predictions.completionDate || new Date().toISOString(),
          budgetForecast: predictions.budgetForecast || 0
        },
        risks: risks,
        recommendations: [] // Derive or add to schema
      }
    } catch (error) {
      console.error('Error analyzing project:', error)
      return this.getDefaultAnalysis()
    }
  }

  async generatePrediction(projectId: string): Promise<{
    successProbability: number
    completionDate: string
    budgetForecast: number
    risks: string[]
  }> {
    try {
      const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: true,
          members: {
            include: {
              user: true
            }
          },
          aiMetrics: true
        }
      })

      if (!projectData) {
        return {
          successProbability: 0,
          completionDate: new Date().toISOString(),
          budgetForecast: 0,
          risks: []
        }
      }

      const aiMetrics = projectData.aiMetrics
      const predictions = aiMetrics?.predictions as any || {}
      const risks = aiMetrics?.risks as string[] || []

      if (aiMetrics) {
        return {
          successProbability: predictions.successProbability || 0,
          completionDate: predictions.completionDate || new Date().toISOString(),
          budgetForecast: predictions.budgetForecast || 0,
          risks
        }
      }

      // Fallback if no metrics
      return {
        successProbability: 0,
        completionDate: new Date().toISOString(),
        budgetForecast: 0,
        risks: []
      }

    } catch (error) {
      console.error('Error generating prediction:', error)
      return {
        successProbability: 0,
        completionDate: new Date().toISOString(),
        budgetForecast: 0,
        risks: []
      }
    }
  }

  async generateChatResponse(message: string, projectId: string): Promise<string> {
    try {
      const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: true,
          members: {
            include: {
              user: true
            }
          }
        }
      })

      if (!projectData) {
        return '죄송합니다. 프로젝트 정보를 찾을 수 없습니다.'
      }

      const context = `
Project: ${projectData.name}
Description: ${projectData.description || 'No description'}
Status: ${projectData.status}
Progress: ${projectData.progress}%
Team Members: ${projectData.members.map(m => `${m.user.name} (${m.role})`).join(', ')}

Tasks:
${projectData.tasks.map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority})`).join('\n')}
`

      const prompt = `
당신은 프로젝트 관리 AI 어시스턴트입니다.
다음 프로젝트 컨텍스트를 바탕으로 사용자의 질문에 답변해주세요.

${context}

사용자 질문: ${message}
`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Error generating chat response:', error)
      return '죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다.'
    }
  }
}

export const aiService = new AIService()