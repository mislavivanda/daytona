/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import React, { useEffect, useState } from 'react'
import { Sandbox, SandboxState } from '@daytonaio/api-client'
import { SandboxState as SandboxStateComponent } from './SandboxTable/SandboxState'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { useApi } from '@/hooks/useApi'
import { useSelectedOrganization } from '@/hooks/useSelectedOrganization'
import { handleApiError } from '@/lib/error-handling'
import { getRelativeTimeString } from '@/lib/utils'
import { toast } from 'sonner'
import { Archive, Camera, X, GitFork, Trash, Play, Tag, Check, Copy, Plus } from 'lucide-react'

interface SandboxDetailsSheetProps {
  sandbox: Sandbox | null
  open: boolean
  onOpenChange: (open: boolean) => void
  loadingSandboxes: Record<string, boolean>
  setLoadingSandboxes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  handleStart: (id: string) => void
  handleStop: (id: string) => void
  handleDelete: (id: string) => void
  handleArchive: (id: string) => void
  getWebTerminalUrl: (id: string) => Promise<string | null>
  writePermitted: boolean
  deletePermitted: boolean
}

const SandboxDetailsSheet: React.FC<SandboxDetailsSheetProps> = ({
  sandbox,
  open,
  onOpenChange,
  loadingSandboxes,
  setLoadingSandboxes,
  handleStart,
  handleStop,
  handleDelete,
  handleArchive,
  getWebTerminalUrl,
  writePermitted,
  deletePermitted,
}) => {
  const { sandboxApi } = useApi()
  const { selectedOrganization, authenticatedUserOrganizationMember } = useSelectedOrganization()

  const [terminalUrl, setTerminalUrl] = useState<string | null>(null)
  const [showCreateSshDialog, setShowCreateSshDialog] = useState(false)
  const [showRevokeSshDialog, setShowRevokeSshDialog] = useState(false)
  const [sshToken, setSshToken] = useState<string>('')
  const [sshExpiryMinutes, setSshExpiryMinutes] = useState<number>(60)
  const [revokeSshToken, setRevokeSshToken] = useState<string>('')
  const [sshSandboxId, setSshSandboxId] = useState<string>('')
  const [copied, setCopied] = useState<string | null>(null)

  // TODO: uncomment when we enable the terminal tab
  // useEffect(() => {
  //   const getTerminalUrl = async () => {
  //     if (!sandbox?.id) {
  //       setTerminalUrl(null)
  //       return
  //     }

  //     const url = await getWebTerminalUrl(sandbox.id)
  //     setTerminalUrl(url)
  //   }

  //   getTerminalUrl()
  // }, [sandbox?.id, getWebTerminalUrl])

  if (!sandbox) return null

  const getLastEvent = (sandbox: Sandbox): { date: Date; relativeTimeString: string } => {
    return getRelativeTimeString(sandbox.updatedAt)
  }

  const handleCreateSshAccess = async (id: string) => {
    setLoadingSandboxes((prev) => ({ ...prev, [id]: true }))
    try {
      const response = await sandboxApi.createSshAccess(id, selectedOrganization?.id, sshExpiryMinutes)
      setSshToken(response.data.token)
      setSshSandboxId(id)
      setShowCreateSshDialog(true)
      toast.success('SSH access created successfully')
    } catch (error) {
      handleApiError(error, 'Failed to create SSH access')
    } finally {
      setLoadingSandboxes((prev) => ({ ...prev, [id]: false }))
    }
  }

  const openCreateSshDialog = (id: string) => {
    setSshSandboxId(id)
    setShowCreateSshDialog(true)
  }

  const handleRevokeSshAccess = async (id: string) => {
    if (!revokeSshToken.trim()) {
      toast.error('Please enter a token to revoke')
      return
    }

    setLoadingSandboxes((prev) => ({ ...prev, [id]: true }))
    try {
      await sandboxApi.revokeSshAccess(id, selectedOrganization?.id, revokeSshToken)
      setRevokeSshToken('')
      setSshSandboxId('')
      setShowRevokeSshDialog(false)
      toast.success('SSH access revoked successfully')
    } catch (error) {
      handleApiError(error, 'Failed to revoke SSH access')
    } finally {
      setLoadingSandboxes((prev) => ({ ...prev, [id]: false }))
    }
  }

  const openRevokeSshDialog = (id: string) => {
    setSshSandboxId(id)
    setShowRevokeSshDialog(true)
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-dvw sm:w-[800px] p-0 flex flex-col gap-0 [&>button]:hidden">
        <SheetHeader className="space-y-0 flex flex-row justify-between items-center p-6">
          <SheetTitle className="text-2xl font-medium">Sandbox Details</SheetTitle>
          <div className="flex gap-2 items-center">
            {writePermitted && (
              <>
                {sandbox.state === SandboxState.STARTED && (
                  <Button
                    variant="outline"
                    onClick={() => handleStop(sandbox.id)}
                    disabled={loadingSandboxes[sandbox.id]}
                  >
                    Stop
                  </Button>
                )}
                {(sandbox.state === SandboxState.STOPPED || sandbox.state === SandboxState.ARCHIVED) && (
                  <Button
                    variant="outline"
                    onClick={() => handleStart(sandbox.id)}
                    disabled={loadingSandboxes[sandbox.id]}
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </Button>
                )}
                {/* {(sandbox.state === SandboxState.STOPPED || sandbox.state === SandboxState.ARCHIVED) && (
                  <Button
                    variant="outline"
                    onClick={() => handleFork(sandbox.id)}
                    disabled={loadingSandboxes[sandbox.id]}
                  >
                    <GitFork className="w-4 h-4" />
                    Fork
                  </Button>
                )}
                {(sandbox.state === SandboxState.STOPPED || sandbox.state === SandboxState.ARCHIVED) && (
                  <Button
                    variant="outline"
                    onClick={() => handleSnapshot(sandbox.id)}
                    disabled={loadingSandboxes[sandbox.id]}
                  >
                    <Camera className="w-4 h-4" />
                    Snapshot
                  </Button>
                )} */}
                {sandbox.state === SandboxState.STOPPED && (
                  <Button
                    variant="outline"
                    className="w-8 h-8"
                    onClick={() => handleArchive(sandbox.id)}
                    disabled={loadingSandboxes[sandbox.id]}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            {deletePermitted && (
              <Button
                variant="outline"
                className="w-8 h-8"
                onClick={() => handleDelete(sandbox.id)}
                disabled={loadingSandboxes[sandbox.id]}
              >
                <Trash className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              className="w-8 h-8"
              onClick={() => onOpenChange(false)}
              disabled={loadingSandboxes[sandbox.id]}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          {/* TODO: Add terminal tab */}
          {/* <TabsList className="px-4 w-full flex-shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="terminal">Terminal</TabsTrigger>
          </TabsList> */}
          <TabsContent value="overview" className="flex-1 p-6 space-y-10 overflow-y-auto min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr_1fr_1fr] gap-6">
              <div>
                <h3 className="text-sm text-muted-foreground">ID</h3>
                <p className="mt-1 text-sm font-medium">{sandbox.id}</p>
              </div>
              <div>
                <h3 className="text-sm text-muted-foreground">State</h3>
                <div className="mt-1 text-sm">
                  <SandboxStateComponent state={sandbox.state} errorReason={sandbox.errorReason} />
                </div>
              </div>
              <div>
                <h3 className="text-sm text-muted-foreground">Snapshot</h3>
                <p className="mt-1 text-sm font-medium">{sandbox.snapshot}</p>
              </div>
              <div>
                <h3 className="text-sm text-muted-foreground">Region</h3>
                <p className="mt-1 text-sm font-medium">{sandbox.target}</p>
              </div>
              <div>
                <h3 className="text-sm text-muted-foreground">Resources</h3>
                <div className="mt-1 text-sm font-medium flex items-center gap-1">
                  <div className="flex items-center gap-1 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-200 rounded-full px-2">
                    {sandbox.cpu} vCPU
                  </div>
                  <div className="flex items-center gap-1 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-200 rounded-full px-2">
                    {sandbox.memory} GiB
                  </div>
                  <div className="flex items-center gap-1 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-200 rounded-full px-2">
                    {sandbox.disk} GiB
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm text-muted-foreground">Last used</h3>
                <p className="mt-1 text-sm font-medium">{getLastEvent(sandbox).relativeTimeString}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium">Labels</h3>
              <div className="mt-3 space-y-4">
                {Object.entries(sandbox.labels ?? {}).length > 0 ? (
                  Object.entries(sandbox.labels ?? {}).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <div>{key}</div>
                      <div className="font-medium p-2 bg-muted rounded-md mt-1 border border-border">{value}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col border border-border rounded-md items-center justify-center gap-2 text-muted-foreground w-full min-h-40">
                    <Tag className="w-4 h-4" />
                    <span className="text-sm">No labels found</span>
                  </div>
                )}
              </div>
            </div>
            {writePermitted && (
              <div>
                <h3 className="text-lg font-medium">SSH Access</h3>
                <div className="mt-3">
                  <div className="flex gap-4 items-center">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={loadingSandboxes[sandbox.id]}
                      className="w-auto px-4"
                      onClick={() => openCreateSshDialog(sandbox.id)}
                      title="Create SSH Access"
                    >
                      <Plus className="w-4 h-4" />
                      Create
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingSandboxes[sandbox.id]}
                      className="w-auto px-4"
                      onClick={() => openRevokeSshDialog(sandbox.id)}
                      title="Revoke SSH Access"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="terminal" className="p-4">
            <iframe title="Terminal" src={terminalUrl || undefined} className="w-full h-full"></iframe>
          </TabsContent>
        </Tabs>
      </SheetContent>
      {/* Create SSH Access Dialog */}
      <AlertDialog
        open={showCreateSshDialog}
        onOpenChange={(isOpen) => {
          setShowCreateSshDialog(isOpen)
          if (!isOpen) {
            setSshToken('')
            setSshExpiryMinutes(60)
            setSshSandboxId('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create SSH Access</AlertDialogTitle>
            <AlertDialogDescription>
              {sshToken
                ? 'SSH access has been created successfully. Use the token below to connect:'
                : 'Set the expiration time for SSH access:'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {!sshToken ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Expiry (minutes):</Label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={sshExpiryMinutes}
                  onChange={(e) => setSshExpiryMinutes(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            ) : (
              <div className="p-3 flex justify-between items-center rounded-md bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400">
                <span className="overflow-x-auto pr-2 cursor-text select-all">
                  {import.meta.env.VITE_SSH_GATEWAY_COMMAND?.replace('{{TOKEN}}', sshToken) ||
                    `ssh -p 22222 user@host -o ProxyCommand="echo ${sshToken}"`}
                </span>
                {(copied === 'SSH Command' && <Check className="w-4 h-4" />) || (
                  <Copy
                    className="w-4 h-4 cursor-pointer"
                    onClick={() =>
                      copyToClipboard(
                        import.meta.env.VITE_SSH_GATEWAY_COMMAND?.replace('{{TOKEN}}', sshToken) ||
                          `ssh -p 22222 user@host -o ProxyCommand="echo ${sshToken}"`,
                        'SSH Command',
                      )
                    }
                  />
                )}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            {!sshToken ? (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleCreateSshAccess(sshSandboxId)}
                  disabled={!sshSandboxId}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Create
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={() => setShowCreateSshDialog(false)}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Close
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Revoke SSH Access Dialog */}
      <AlertDialog
        open={showRevokeSshDialog}
        onOpenChange={(isOpen) => {
          setShowRevokeSshDialog(isOpen)
          if (!isOpen) {
            setRevokeSshToken('')
            setSshSandboxId('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke SSH Access</AlertDialogTitle>
            <AlertDialogDescription>Enter the SSH access token you want to revoke:</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">SSH Token:</label>
              <input
                type="text"
                value={revokeSshToken}
                onChange={(e) => setRevokeSshToken(e.target.value)}
                placeholder="Enter SSH token to revoke"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRevokeSshAccess(sshSandboxId)}
              disabled={!revokeSshToken.trim() || !sshSandboxId}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}

export default SandboxDetailsSheet
