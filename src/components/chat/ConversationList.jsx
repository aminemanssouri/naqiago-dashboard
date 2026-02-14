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
            <div className="flex flex-col gap-1 p-2">
                {conversations.map((conv) => {
                    const unread = conv.admin_unread_count || 0

                    return (
                        <button
                            key={conv.id}
                            onClick={() => onSelect(conv)}
                            className={cn(
                                "flex items-start gap-3 p-3 text-left rounded-lg transition-colors hover:bg-muted/50 w-full",
                                selectedId === conv.id ? "bg-muted" : "transparent"
                            )}
                        >
                            <div className="relative">
                                <Avatar className="w-10 h-10 border">
                                    <AvatarImage src={conv.worker?.user?.avatar_url} />
                                    <AvatarFallback>
                                        {conv.worker?.business_name?.charAt(0) || 'W'}
                                    </AvatarFallback>
                                </Avatar>
                                {unread > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                        {unread > 9 ? '9+' : unread}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={cn(
                                        "truncate text-sm",
                                        unread > 0 ? "font-bold" : "font-semibold"
                                    )}>
                                        {conv.worker?.business_name || 'Worker'}
                                    </span>
                                    {conv.last_message_at && (
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <span className={cn(
                                        "text-xs truncate max-w-[140px]",
                                        unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                                    )}>
                                        {conv.last_message_preview || 'No messages yet'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </ScrollArea>
    )
}
