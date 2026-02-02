"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"

export function ConversationList({
    conversations = [],
    selectedId,
    onSelect
}) {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <p>No active conversations.</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="flex flex-col gap-2 p-2">
                {conversations.map((conv) => (
                    <button
                        key={conv.id}
                        onClick={() => onSelect(conv)}
                        className={cn(
                            "flex items-start gap-3 p-3 text-left rounded-lg transition-colors hover:bg-muted/50",
                            selectedId === conv.id ? "bg-muted" : "transparent"
                        )}
                    >
                        <Avatar className="w-10 h-10 border">
                            <AvatarImage src={conv.worker?.user?.avatar_url} />
                            <AvatarFallback>
                                {conv.worker?.business_name?.charAt(0) || 'W'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold truncate text-sm">
                                    {conv.worker?.business_name || 'Worker'}
                                </span>
                                {conv.last_message_at && (
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                                    {conv.last_message?.content || 'No messages yet'}
                                </span>
                                {/* Unread indicator could go here */}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </ScrollArea>
    )
}
