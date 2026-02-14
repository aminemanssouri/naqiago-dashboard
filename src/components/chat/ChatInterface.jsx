"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Send, Search, Loader2, Plus, MessageSquarePlus } from "lucide-react"
import { ConversationList } from "./ConversationList"
import { MessageBubble } from "./MessageBubble"
import {
    getConversations,
    getMessages,
    sendMessage,
    createConversation,
    markConversationAsRead,
    getWorkersForChat,
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

    // New conversation dialog state
    const [showNewDialog, setShowNewDialog] = useState(false)
    const [workers, setWorkers] = useState([])
    const [workersLoading, setWorkersLoading] = useState(false)
    const [workerSearch, setWorkerSearch] = useState("")
    const [selectedWorker, setSelectedWorker] = useState(null)
    const [newSubject, setNewSubject] = useState("")
    const [creating, setCreating] = useState(false)

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
            setMessages(prev => {
                if (prev.some(msg => msg.id === payload.id)) return prev
                return [...prev, { ...payload, sent_fresh: true }]
            })

            // If incoming message is from a worker, mark as read since admin has it open
            if (payload.sender_role === 'worker') {
                markConversationAsRead(selectedConversation.id)
                setConversations(prev => prev.map(c =>
                    c.id === selectedConversation.id
                        ? { ...c, admin_unread_count: 0 }
                        : c
                ))
            }
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

    // Handle selecting a conversation — mark as read
    const handleSelectConversation = async (conv) => {
        setSelectedConversation(conv)

        if (conv.admin_unread_count > 0) {
            markConversationAsRead(conv.id)
            setConversations(prev => prev.map(c =>
                c.id === conv.id
                    ? { ...c, admin_unread_count: 0 }
                    : c
            ))
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || !selectedConversation) return

        const tempContent = newMessage
        setNewMessage("")
        setSending(true)

        try {
            const msg = await sendMessage({
                conversationId: selectedConversation.id,
                senderId: profile.id,
                content: tempContent,
                senderRole: 'admin'
            })

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

            setConversations(prev => prev.map(c =>
                c.id === selectedConversation.id
                    ? { ...c, last_message_preview: tempContent, last_message_at: new Date().toISOString() }
                    : c
            ))
        } catch (error) {
            toast.error("Failed to send message")
            setNewMessage(tempContent)
        } finally {
            setSending(false)
        }
    }

    // --- New Conversation Dialog ---

    const handleOpenNewDialog = async () => {
        setShowNewDialog(true)
        setSelectedWorker(null)
        setNewSubject("")
        setWorkerSearch("")

        try {
            setWorkersLoading(true)
            const data = await getWorkersForChat()
            setWorkers(data)
        } catch (error) {
            toast.error("Failed to load workers")
        } finally {
            setWorkersLoading(false)
        }
    }

    const handleCreateConversation = async () => {
        if (!selectedWorker || !newSubject.trim()) {
            toast.error("Please select a worker and enter a subject")
            return
        }

        try {
            setCreating(true)
            const newConv = await createConversation({
                workerId: selectedWorker.id,
                adminId: profile.id,
                subject: newSubject.trim()
            })

            setConversations(prev => [newConv, ...prev])
            setSelectedConversation(newConv)
            setMessages([])
            setShowNewDialog(false)
            toast.success("Conversation created!")
        } catch (error) {
            toast.error("Failed to create conversation: " + (error.message || "Unknown error"))
        } finally {
            setCreating(false)
        }
    }

    const filteredWorkers = workers.filter(w =>
        w.business_name?.toLowerCase().includes(workerSearch.toLowerCase()) ||
        w.user?.full_name?.toLowerCase().includes(workerSearch.toLowerCase())
    )

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
                {/* Left Panel: Conversations List */}
                <Card className="col-span-1 flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg">Messages</h2>
                            <Button
                                size="sm"
                                onClick={handleOpenNewDialog}
                                className="flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" />
                                New
                            </Button>
                        </div>
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
                            onSelect={handleSelectConversation}
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
                            <div className="flex-1 overflow-hidden min-h-0">
                                <ScrollArea className="h-full p-4">
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
                            </div>

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

            {/* New Conversation Dialog */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquarePlus className="h-5 w-5" />
                            New Conversation
                        </DialogTitle>
                        <DialogDescription>
                            Start a new conversation with a worker.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Subject */}
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                placeholder="e.g. Schedule discussion, Payment issue..."
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                            />
                        </div>

                        {/* Worker Selection */}
                        <div className="space-y-2">
                            <Label>Select Worker</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search workers..."
                                    className="pl-8"
                                    value={workerSearch}
                                    onChange={(e) => setWorkerSearch(e.target.value)}
                                />
                            </div>

                            <ScrollArea className="h-48 border rounded-md">
                                {workersLoading ? (
                                    <div className="flex items-center justify-center h-full py-8">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filteredWorkers.length === 0 ? (
                                    <div className="flex items-center justify-center h-full py-8 text-muted-foreground text-sm">
                                        No workers found
                                    </div>
                                ) : (
                                    <div className="p-1">
                                        {filteredWorkers.map((worker) => (
                                            <button
                                                key={worker.id}
                                                onClick={() => setSelectedWorker(worker)}
                                                className={`flex items-center gap-3 w-full p-2 rounded-md text-left transition-colors ${selectedWorker?.id === worker.id
                                                    ? 'bg-primary/10 border border-primary/30'
                                                    : 'hover:bg-muted/50'
                                                    }`}
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={worker.user?.avatar_url} />
                                                    <AvatarFallback className="text-xs">
                                                        {worker.business_name?.charAt(0) || 'W'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">
                                                        {worker.business_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {worker.user?.full_name}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowNewDialog(false)}
                            disabled={creating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateConversation}
                            disabled={!selectedWorker || !newSubject.trim() || creating}
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Start Conversation'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
