"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"

export function MessageBubble({ message, isMe }) {
    const senderName = message.sender?.full_name || 'User'
    const time = message.created_at ? format(new Date(message.created_at), 'HH:mm') : ''

    return (
        <div className={cn(
            "flex w-full gap-2 mb-4",
            isMe ? "flex-row-reverse" : "flex-row"
        )}>
            <Avatar className="w-8 h-8">
                <AvatarImage src={message.sender?.avatar_url} />
                <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className={cn(
                "flex flex-col max-w-[70%]",
                isMe ? "items-end" : "items-start"
            )}>
                <div className={cn(
                    "px-4 py-2 rounded-lg text-sm",
                    isMe
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                )}>
                    {message.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {time}
                </span>
            </div>
        </div>
    )
}
