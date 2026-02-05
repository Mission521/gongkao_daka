import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'

interface UseDraftOptions<T> {
  pageType: string
  initialData: T
  onRecover?: (data: T) => void
  autoSaveInterval?: number // ms, default 30000 (30s)
  isEmpty?: (data: T) => boolean
}

interface DraftMetadata {
  content: any
  updated_at: string
}

export function useDraft<T>({ 
  pageType, 
  initialData, 
  onRecover,
  autoSaveInterval = 30000,
  isEmpty
}: UseDraftOptions<T>) {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const draftDataRef = useRef<T>(initialData)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const shouldSaveRef = useRef(true)

  // Update ref when data changes
  const updateDraftData = useCallback((data: T) => {
    draftDataRef.current = data
  }, [])

  const checkEmpty = useCallback((data: T) => {
    if (isEmpty) return isEmpty(data)
    // Default check: simple null/undefined check
    return data === null || data === undefined || data === ''
  }, [isEmpty])

  // Save to LocalStorage
  const saveToLocal = useCallback((data: T) => {
    if (!user || !shouldSaveRef.current) return
    const key = `draft_${user.id}_${pageType}`

    if (checkEmpty(data)) {
      // If empty, remove draft instead of saving empty one
      localStorage.removeItem(key)
      return
    }

    localStorage.setItem(key, JSON.stringify({
      content: data,
      updated_at: new Date().toISOString()
    }))
  }, [user, pageType, checkEmpty])

  // Save to Supabase
  const saveToRemote = useCallback(async (data: T) => {
    if (!user || !shouldSaveRef.current) return
    
    // If empty, we don't save to remote, and ideally we might want to delete remote if it exists?
    // But for auto-save, we probably just skip saving.
    // However, if user cleared content, we should probably reflect that.
    // Let's rely on manual clear for full cleanup, but here we just skip saving empty data to avoid polluting.
    // Actually, if it's empty, we should probably delete it to be consistent with local.
    if (checkEmpty(data)) {
      try {
        await supabase
          .from('drafts')
          .delete()
          .eq('user_id', user.id)
          .eq('page_type', pageType)
        setHasDraft(false)
      } catch (e) {
        console.error('Error clearing empty remote draft', e)
      }
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('drafts')
        .upsert({
          user_id: user.id,
          page_type: pageType,
          content: data as any,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, page_type' })

      if (error) throw error

      setLastSaved(new Date())
      setHasDraft(true)
    } catch (error) {
      console.error('Error saving draft to remote:', error)
      // We don't show toast for auto-save errors to avoid annoyance, 
      // but we might want to track it or show a subtle indicator
    } finally {
      setSaving(false)
    }
  }, [user, pageType])

  // Combined save function
  const saveDraft = useCallback(async (data: T, manual = false) => {
    saveToLocal(data)
    
    if (manual) {
      await saveToRemote(data)
      addToast({
        title: '草稿已保存',
        message: '您的内容已成功保存到云端',
        type: 'success'
      })
    } else {
      // Debounce/Interval logic is handled by the effect, 
      // but if we want to force an auto-save (e.g. before route change), we can call this.
      // For now, this function is mostly for manual save or immediate save.
      saveToRemote(data)
    }
  }, [saveToLocal, saveToRemote, addToast])

  // Load draft
  useEffect(() => {
    if (!user) return

    const loadDraft = async () => {
      const localKey = `draft_${user.id}_${pageType}`
      const localStr = localStorage.getItem(localKey)
      let localDraft: DraftMetadata | null = null
      
      if (localStr) {
        try {
          localDraft = JSON.parse(localStr)
        } catch (e) {
          console.error('Error parsing local draft', e)
        }
      }

      // Check remote
      const { data: remoteDraft, error } = await supabase
        .from('drafts')
        .select('content, updated_at')
        .eq('user_id', user.id)
        .eq('page_type', pageType)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error fetching remote draft', error)
      }

      let bestDraft: T | null = null
      let source = ''

      if (localDraft && remoteDraft) {
        const localTime = new Date(localDraft.updated_at).getTime()
        const remoteTime = new Date(remoteDraft.updated_at).getTime()
        
        if (localTime >= remoteTime) {
          bestDraft = localDraft.content
          source = 'local'
        } else {
          bestDraft = remoteDraft.content
          source = 'remote'
        }
      } else if (localDraft) {
        bestDraft = localDraft.content
        source = 'local'
      } else if (remoteDraft) {
        bestDraft = remoteDraft.content
        source = 'remote'
      }

      if (bestDraft) {
        // Final check for emptiness
        if (checkEmpty(bestDraft)) {
          return
        }

        setHasDraft(true)
        setLastSaved(new Date(source === 'local' ? localDraft!.updated_at : remoteDraft.updated_at))
        if (onRecover) {
          onRecover(bestDraft)
          addToast({
            title: '草稿已恢复',
            message: '已自动恢复您上次未发布的内容',
            type: 'info'
          })
        }
      }
    }

    loadDraft()
  }, [user, pageType]) // Removed onRecover from deps to avoid loop if not memoized, but user should memoize it.

  // Auto-save interval
  useEffect(() => {
    if (!user) return

    autoSaveTimerRef.current = setInterval(() => {
      if (JSON.stringify(draftDataRef.current) !== JSON.stringify(initialData)) {
        // Only save if data has changed from initial (simplistic check, better to check against last saved)
        // Ideally we should track "isDirty"
        saveToRemote(draftDataRef.current)
      }
    }, autoSaveInterval)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [user, autoSaveInterval, initialData, saveToRemote])

  // Save on unmount / beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveToLocal(draftDataRef.current)
      // We can't await async saveToRemote here, so we rely on local storage for immediate recovery
      // and maybe sync next time.
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Also save to local on unmount
      saveToLocal(draftDataRef.current)
    }
  }, [saveToLocal])

  const clearDraft = useCallback(async () => {
    if (!user) return
    
    // Prevent further saves
    shouldSaveRef.current = false

    // Clear local
    const key = `draft_${user.id}_${pageType}`
    localStorage.removeItem(key)
    
    // Clear remote
    try {
      await supabase
        .from('drafts')
        .delete()
        .eq('user_id', user.id)
        .eq('page_type', pageType)
      
      setHasDraft(false)
      setLastSaved(null)
      
      addToast({
        title: '草稿已清除',
        message: '发布成功，草稿已自动清除',
        type: 'success'
      })
    } catch (error) {
      console.error('Error clearing draft:', error)
    }
  }, [user, pageType, addToast])

  return {
    saving,
    lastSaved,
    hasDraft,
    saveDraft,
    clearDraft,
    updateDraftData
  }
}
