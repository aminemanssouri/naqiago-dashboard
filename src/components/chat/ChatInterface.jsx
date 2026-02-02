"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Search, Loader2 } from "lucide-react"
import { ConversationList } from "./ConversationList"
import { MessageBubble } from "./MessageBubble"
import {
    getConversations,
    getMessages,
    sendMessage,
    subscribeToMessages
} from "@/services/admin-chat"
import { toast } from "sonner"

export function ChatInterface() {
    const { profile } = useAuth()
    const [conversations, setConversations] = useState([])
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    const scrollRef = useRef(null)

    // Fetch conversations on mount
    useEffect(() => {
        loadConversations()
    }, [])

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    // Subscribe to real-time messages when a conversation is selected
    useEffect(() => {
        if (!selectedConversation) return

        loadMessages(selectedConversation.id)

        const subscription = subscribeToMessages(selectedConversation.id, (payload) => {
            // Check if message ID already exists to prevent duplicates
            setMessages(prev => {
                if (prev.some(msg => msg.id === payload.id)) return prev
                return [...prev, { ...payload, sent_fresh: true }]
            })
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [selectedConversation])

    const loadConversations = async () => {
        try {
            setLoading(true)
            const { data } = await getConversations({ search: searchTerm })
            setConversations(data || [])
        } catch (error) {
            toast.error("Failed to load conversations")
        } finally {
            setLoading(false)
        }
    }

    const loadMessages = async (id) => {
        try {
            const msgs = await getMessages(id)
            setMessages(msgs || [])
        } catch (error) {
            toast.error("Failed to load messages")
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || !selectedConversation) return

        const tempContent = newMessage
        setNewMessage("") // Clear input immediately
        setSending(true)

        try {
            const msg = await sendMessage({
                conversationId: selectedConversation.id,
                senderId: profile.id,
                content: tempContent,
                senderRole: 'admin' // Force role to match table constraint
            })

            // Add to local state (optimistic) with sender info
            const enrichedMsg = {
                ...msg,
                sender: {
                    id: profile.id,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url
                }
            }

            setMessages(prev => {
                if (prev.some(m => m.id === enrichedMsg.id)) return prev
                return [...prev, enrichedMsg]
            })

            // Update last message in conversation list
            setConversations(prev => prev.map(c =>
                c.id === selectedConversation.id
                    ? { ...c, last_message: { content: tempContent }, last_message_at: new Date() }
                    : c
            ))

        } catch (error) {
            toast.error("Failed to send message")
            setNewMessage(tempContent) // Restore input on fail
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
            {/* Left Panel: Conversations List */}
            <Card className="col-span-1 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b space-y-4">
                    <h2 className="font-semibold text-lg">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search conversations..."
                            className="pl-8 bg-muted/50 border-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadConversations()}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <ConversationList
                        conversations={conversations}
                        selectedId={selectedConversation?.id}
                        onSelect={setSelectedConversation}
                    />
                )}
            </Card>

            {/* Right Panel: Chat Window */}
            <Card className="col-span-1 md:col-span-2 flex flex-col h-full overflow-hidden">
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="font-semibold">
                                    {selectedConversation.worker?.business_name || 'Worker'}
                                </div>
                                <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                                    {selectedConversation.subject || 'Support'}
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <ScrollArea className="flex-1 p-4">
                            <div className="flex flex-col gap-2">
                                {messages.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-10">
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <MessageBubble
                                            key={msg.id || i}
                                            message={msg}
                                            isMe={msg.sender_id === profile?.id}
                                        />
                                    ))
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 border-t bg-background">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1"
                                    disabled={sending}
                                />
                                <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                        <div className="p-4 bg-muted/50 rounded-full">
                            <Send className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p>Select a conversation to start messaging</p>
                    </div>
                )}
            </Card>
        </div>
    )
}
