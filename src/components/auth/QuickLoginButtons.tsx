'use client'

import { Button } from '@/components/ui/button'
import { Users, User, Shield } from 'lucide-react'

interface TestAccount {
  email: string
  password: string
  name: string
  role: string
  description: string
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: 'admin@codeb.com',
    password: 'admin123!',
    name: '관리자',
    role: 'admin',
    description: '관리자 계정 (모든 권한)'
  },
  {
    email: 'member@codeb.com',
    password: 'member123!',
    name: '팀원',
    role: 'member',
    description: '팀원 계정 (프로젝트 참여)'
  }
]

export default function QuickLoginButtons({ onLogin }: { onLogin: (email: string, pass: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {TEST_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            variant="outline"
            className="w-full justify-start h-auto py-2 px-4"
            onClick={() => onLogin(account.email, account.password)}
          >
            <div className="flex flex-col items-start text-left">
              <span className="font-medium flex items-center">
                {account.role === 'admin' ? <Shield className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />}
                {account.name}
              </span>
              <span className="text-xs text-muted-foreground">{account.description}</span>
            </div>
          </Button>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-600">
          💡 클릭하면 자동으로 로그인됩니다.<br />
          관리자: 모든 기능 접근 가능<br />
          팀원: 프로젝트 및 작업 관리 가능
        </p>
      </div>
    </>
  )
}