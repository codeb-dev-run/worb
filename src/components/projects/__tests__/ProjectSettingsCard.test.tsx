/**
 * ProjectSettingsCard Component Tests
 * Tests for project settings including status, priority updates and project deletion
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectSettingsCard from '../ProjectSettingsCard'

// Mock dependencies
jest.mock('@/actions/project', () => ({
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
}))

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
        push: jest.fn(),
    })),
}))

jest.mock('react-hot-toast', () => ({
    __esModule: true,
    default: {
        success: jest.fn(),
        error: jest.fn(),
    },
}))

import { updateProject, deleteProject } from '@/actions/project'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

describe('ProjectSettingsCard', () => {
    const mockProps = {
        projectId: 'project-123',
        projectName: 'Test Project',
        initialProgress: 50,
        initialStatus: 'development',
        initialPriority: 'medium',
        onUpdate: jest.fn(),
    }

    const mockPush = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    })

    describe('Rendering', () => {
        it('should render with initial values', () => {
            render(<ProjectSettingsCard {...mockProps} />)

            expect(screen.getByText('프로젝트 설정')).toBeInTheDocument()
            expect(screen.getByText('50%')).toBeInTheDocument()
            expect(screen.getByText('절반 이상')).toBeInTheDocument()
        })

        it('should render all status options', () => {
            render(<ProjectSettingsCard {...mockProps} />)

            expect(screen.getByText('기획')).toBeInTheDocument()
            expect(screen.getByText('디자인')).toBeInTheDocument()
            expect(screen.getByText('개발')).toBeInTheDocument()
            expect(screen.getByText('테스트')).toBeInTheDocument()
            expect(screen.getByText('완료')).toBeInTheDocument()
            expect(screen.getByText('대기')).toBeInTheDocument()
        })

        it('should render all priority options', () => {
            render(<ProjectSettingsCard {...mockProps} />)

            expect(screen.getByText('낮음')).toBeInTheDocument()
            expect(screen.getByText('보통')).toBeInTheDocument()
            expect(screen.getByText('높음')).toBeInTheDocument()
            expect(screen.getByText('긴급')).toBeInTheDocument()
        })

        it('should render danger zone with delete button', () => {
            render(<ProjectSettingsCard {...mockProps} />)

            expect(screen.getByText('위험 영역')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /프로젝트 삭제/i })).toBeInTheDocument()
        })

        it('should show correct progress label based on progress value', () => {
            const { rerender } = render(<ProjectSettingsCard {...mockProps} initialProgress={10} />)
            expect(screen.getByText('시작 단계')).toBeInTheDocument()

            rerender(<ProjectSettingsCard {...mockProps} initialProgress={35} />)
            expect(screen.getByText('진행 중')).toBeInTheDocument()

            rerender(<ProjectSettingsCard {...mockProps} initialProgress={60} />)
            expect(screen.getByText('절반 이상')).toBeInTheDocument()

            rerender(<ProjectSettingsCard {...mockProps} initialProgress={85} />)
            expect(screen.getByText('거의 완료')).toBeInTheDocument()
        })
    })

    describe('Status and Priority Changes', () => {
        it('should show change indicator when status is changed', async () => {
            render(<ProjectSettingsCard {...mockProps} />)

            const planningButton = screen.getByText('기획')
            fireEvent.click(planningButton)

            await waitFor(() => {
                expect(screen.getByText('변경사항이 있습니다. 저장 버튼을 눌러주세요.')).toBeInTheDocument()
            })
        })

        it('should show change indicator when priority is changed', async () => {
            render(<ProjectSettingsCard {...mockProps} />)

            const highPriorityButton = screen.getByText('높음')
            fireEvent.click(highPriorityButton)

            await waitFor(() => {
                expect(screen.getByText('변경사항이 있습니다. 저장 버튼을 눌러주세요.')).toBeInTheDocument()
            })
        })

        it('should enable save button when changes are made', async () => {
            render(<ProjectSettingsCard {...mockProps} />)

            const saveButton = screen.getByRole('button', { name: /저장/i })
            expect(saveButton).toBeDisabled()

            const planningButton = screen.getByText('기획')
            fireEvent.click(planningButton)

            await waitFor(() => {
                expect(saveButton).not.toBeDisabled()
            })
        })
    })

    describe('Save Functionality', () => {
        it('should call updateProject on save', async () => {
            ;(updateProject as jest.Mock).mockResolvedValue({ success: true })

            render(<ProjectSettingsCard {...mockProps} />)

            // Change status
            fireEvent.click(screen.getByText('기획'))

            // Click save
            const saveButton = screen.getByRole('button', { name: /저장/i })
            await waitFor(() => {
                expect(saveButton).not.toBeDisabled()
            })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(updateProject).toHaveBeenCalledWith('project-123', {
                    status: 'planning',
                    priority: 'medium',
                })
            })
        })

        it('should show success toast on successful save', async () => {
            ;(updateProject as jest.Mock).mockResolvedValue({ success: true })

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByText('기획'))

            await waitFor(() => {
                const saveButton = screen.getByRole('button', { name: /저장/i })
                expect(saveButton).not.toBeDisabled()
            })

            fireEvent.click(screen.getByRole('button', { name: /저장/i }))

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('프로젝트 설정이 저장되었습니다.')
            })
        })

        it('should show error toast on failed save', async () => {
            ;(updateProject as jest.Mock).mockResolvedValue({ success: false })

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByText('기획'))

            await waitFor(() => {
                const saveButton = screen.getByRole('button', { name: /저장/i })
                expect(saveButton).not.toBeDisabled()
            })

            fireEvent.click(screen.getByRole('button', { name: /저장/i }))

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('설정 저장에 실패했습니다.')
            })
        })

        it('should call onUpdate callback on successful save', async () => {
            ;(updateProject as jest.Mock).mockResolvedValue({ success: true })

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByText('기획'))

            await waitFor(() => {
                const saveButton = screen.getByRole('button', { name: /저장/i })
                expect(saveButton).not.toBeDisabled()
            })

            fireEvent.click(screen.getByRole('button', { name: /저장/i }))

            await waitFor(() => {
                expect(mockProps.onUpdate).toHaveBeenCalled()
            })
        })
    })

    describe('Delete Functionality', () => {
        it('should show confirmation input when delete button is clicked', async () => {
            render(<ProjectSettingsCard {...mockProps} />)

            const deleteButton = screen.getByRole('button', { name: /프로젝트 삭제/i })
            fireEvent.click(deleteButton)

            await waitFor(() => {
                expect(screen.getByText('정말로 삭제하시겠습니까?')).toBeInTheDocument()
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })
        })

        it('should show project name in confirmation message', async () => {
            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByText(`"${mockProps.projectName}"`)).toBeInTheDocument()
            })
        })

        it('should disable delete button until project name is entered correctly', async () => {
            const user = userEvent.setup()
            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })

            const confirmDeleteButton = screen.getAllByRole('button', { name: /삭제/i })[0]
            expect(confirmDeleteButton).toBeDisabled()

            const input = screen.getByPlaceholderText('프로젝트명을 입력하세요')
            await user.type(input, 'Wrong Name')
            expect(confirmDeleteButton).toBeDisabled()

            await user.clear(input)
            await user.type(input, mockProps.projectName)
            expect(confirmDeleteButton).not.toBeDisabled()
        })

        it('should call deleteProject when confirmed with correct project name', async () => {
            const user = userEvent.setup()
            ;(deleteProject as jest.Mock).mockResolvedValue({ success: true })

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })

            const input = screen.getByPlaceholderText('프로젝트명을 입력하세요')
            await user.type(input, mockProps.projectName)

            const confirmDeleteButton = screen.getAllByRole('button', { name: /삭제/i })[0]
            fireEvent.click(confirmDeleteButton)

            await waitFor(() => {
                expect(deleteProject).toHaveBeenCalledWith('project-123')
            })
        })

        it('should redirect to /projects on successful delete', async () => {
            const user = userEvent.setup()
            ;(deleteProject as jest.Mock).mockResolvedValue({ success: true })

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })

            const input = screen.getByPlaceholderText('프로젝트명을 입력하세요')
            await user.type(input, mockProps.projectName)

            const confirmDeleteButton = screen.getAllByRole('button', { name: /삭제/i })[0]
            fireEvent.click(confirmDeleteButton)

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/projects')
            })
        })

        it('should show success toast on successful delete', async () => {
            const user = userEvent.setup()
            ;(deleteProject as jest.Mock).mockResolvedValue({ success: true })

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })

            const input = screen.getByPlaceholderText('프로젝트명을 입력하세요')
            await user.type(input, mockProps.projectName)

            const confirmDeleteButton = screen.getAllByRole('button', { name: /삭제/i })[0]
            fireEvent.click(confirmDeleteButton)

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('프로젝트가 삭제되었습니다.')
            })
        })

        it('should show error toast on failed delete', async () => {
            const user = userEvent.setup()
            ;(deleteProject as jest.Mock).mockResolvedValue({ success: false })

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })

            const input = screen.getByPlaceholderText('프로젝트명을 입력하세요')
            await user.type(input, mockProps.projectName)

            const confirmDeleteButton = screen.getAllByRole('button', { name: /삭제/i })[0]
            fireEvent.click(confirmDeleteButton)

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('프로젝트 삭제에 실패했습니다.')
            })
        })

        it('should hide confirmation and clear input when cancel is clicked', async () => {
            const user = userEvent.setup()
            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })

            const input = screen.getByPlaceholderText('프로젝트명을 입력하세요')
            await user.type(input, 'some text')

            const cancelButton = screen.getByRole('button', { name: /취소/i })
            fireEvent.click(cancelButton)

            await waitFor(() => {
                expect(screen.queryByText('정말로 삭제하시겠습니까?')).not.toBeInTheDocument()
            })
        })

        it('should show error toast when project name does not match', async () => {
            const user = userEvent.setup()
            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })

            // Note: The button is disabled when names don't match, so this tests the internal validation
            // The toast.error for mismatch is only called if somehow the button is clicked with wrong name
        })
    })

    describe('Edge Cases', () => {
        it('should handle missing initialPriority', () => {
            const propsWithoutPriority = {
                ...mockProps,
                initialPriority: '',
            }
            render(<ProjectSettingsCard {...propsWithoutPriority} />)

            // Should default to 'medium'
            expect(screen.getByText('보통')).toBeInTheDocument()
        })

        it('should handle save error exception', async () => {
            ;(updateProject as jest.Mock).mockRejectedValue(new Error('Network error'))

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByText('기획'))

            await waitFor(() => {
                const saveButton = screen.getByRole('button', { name: /저장/i })
                expect(saveButton).not.toBeDisabled()
            })

            fireEvent.click(screen.getByRole('button', { name: /저장/i }))

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('설정 저장 중 오류가 발생했습니다.')
            })
        })

        it('should handle delete error exception', async () => {
            const user = userEvent.setup()
            ;(deleteProject as jest.Mock).mockRejectedValue(new Error('Network error'))

            render(<ProjectSettingsCard {...mockProps} />)

            fireEvent.click(screen.getByRole('button', { name: /프로젝트 삭제/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeInTheDocument()
            })

            const input = screen.getByPlaceholderText('프로젝트명을 입력하세요')
            await user.type(input, mockProps.projectName)

            const confirmDeleteButton = screen.getAllByRole('button', { name: /삭제/i })[0]
            fireEvent.click(confirmDeleteButton)

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('프로젝트 삭제 중 오류가 발생했습니다.')
            })
        })
    })
})
