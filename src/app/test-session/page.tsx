
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'

export default async function Page() {
    const session = await getServerSession(authOptions)
    return (
        <div>
            <h1>Session Check</h1>
            <pre>{JSON.stringify(session, null, 2)}</pre>
        </div>
    )
}
