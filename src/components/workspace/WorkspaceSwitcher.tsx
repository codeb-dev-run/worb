'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, PlusCircle, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Workspace = {
    id: string
    name: string
    plan: string
}

export default function WorkspaceSwitcher({
    className,
}: React.HTMLAttributes<HTMLDivElement>) {
    const [open, setOpen] = React.useState(false)
    const [selectedWorkspace, setSelectedWorkspace] = React.useState<Workspace | null>(null)
    const [workspaces, setWorkspaces] = React.useState<Workspace[]>([])

    React.useEffect(() => {
        // Fetch workspaces
        fetch('/api/workspaces')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setWorkspaces(data)
                    setSelectedWorkspace(data[0]) // Default to first workspace
                }
            })
            .catch(err => console.error('Failed to load workspaces', err))
    }, [])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Select a workspace"
                    className={cn("w-full justify-between h-12 px-3 border-dashed", className)}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={`https://avatar.vercel.sh/${selectedWorkspace?.id}.png`} alt={selectedWorkspace?.name} />
                            <AvatarFallback>WS</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">
                            {selectedWorkspace?.name || "워크스페이스 선택"}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
                <Command>
                    <CommandList>
                        <CommandInput placeholder="워크스페이스 검색..." />
                        <CommandEmpty>워크스페이스를 찾을 수 없습니다.</CommandEmpty>
                        <CommandGroup heading="내 워크스페이스">
                            {workspaces.map((workspace) => (
                                <CommandItem
                                    key={workspace.id}
                                    onSelect={() => {
                                        setSelectedWorkspace(workspace)
                                        setOpen(false)
                                    }}
                                    className="text-sm"
                                >
                                    <Avatar className="mr-2 h-5 w-5">
                                        <AvatarImage
                                            src={`https://avatar.vercel.sh/${workspace.id}.png`}
                                            alt={workspace.name}
                                            className="grayscale"
                                        />
                                        <AvatarFallback>SC</AvatarFallback>
                                    </Avatar>
                                    {workspace.name}
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            selectedWorkspace?.id === workspace.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    <CommandSeparator />
                    <CommandList>
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    setOpen(false)
                                    // TODO: Open create workspace dialog
                                }}
                            >
                                <PlusCircle className="mr-2 h-5 w-5" />
                                새 워크스페이스 생성
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
