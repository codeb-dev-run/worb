import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { NextApiRequest, NextApiResponse } from 'next'

export type NextApiResponseServerIO = NextApiResponse & {
    socket: any & {
        server: NetServer & {
            io: SocketIOServer
        }
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
    if (!res.socket.server.io) {
        console.log('New Socket.io server...')
        // adapt Next's net server to http server
        const httpServer: NetServer = res.socket.server as any
        const io = new SocketIOServer(httpServer, {
            path: '/api/socket/io',
            addTrailingSlash: false,
        })

        io.on('connection', (socket) => {
            console.log('Socket connected:', socket.id)

            socket.on('join-project', (projectId: string) => {
                socket.join(`project:${projectId}`)
                console.log(`Socket ${socket.id} joined project:${projectId}`)
            })

            socket.on('task-moved', (data) => {
                // Broadcast to everyone in the room except sender
                socket.to(`project:${data.projectId}`).emit('task-moved', data)
            })

            socket.on('disconnect', () => {
                console.log('Socket disconnected:', socket.id)
            })
        })

        res.socket.server.io = io
    }
    res.end()
}

export default SocketHandler
