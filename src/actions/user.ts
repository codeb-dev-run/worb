'use server'

import { prisma } from '@/lib/prisma'

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                companyName: true,
                department: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return users
    } catch (error) {
        console.error('Failed to get users:', error)
        return []
    }
}

export async function getCustomers() {
    try {
        // For now, return all users as potential customers
        // In the future, you might want to add a separate customer table
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                companyName: true,
                department: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return users
    } catch (error) {
        console.error('Failed to get customers:', error)
        return []
    }
}

export async function getTeamMembers() {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: 'admin'  // Only admins for now
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return users
    } catch (error) {
        console.error('Failed to get team members:', error)
        return []
    }
}
