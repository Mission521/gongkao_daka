import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDraft } from './useDraft'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'

// Mocks
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  }
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn()
}))

vi.mock('../store/uiStore', () => ({
  useUIStore: vi.fn()
}))

describe('useDraft', () => {
  const mockUser = { id: 'user-123' }
  const mockAddToast = vi.fn()
  
  // Mock implementations
  const mockFrom = supabase.from as any
  
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    ;(useAuthStore as any).mockReturnValue({ user: mockUser })
    ;(useUIStore as any).mockReturnValue({ addToast: mockAddToast })
  })

  it('should save to localStorage immediately', () => {
    // Setup mock to avoid crash on load
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }), // Add upsert mock
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          })
        })
      })
    })

    const { result } = renderHook(() => useDraft({
      pageType: 'test',
      initialData: { foo: 'bar' }
    }))

    act(() => {
      result.current.updateDraftData({ foo: 'baz' }) // Update ref
      result.current.saveDraft({ foo: 'baz' })
    })

    const stored = localStorage.getItem('draft_user-123_test')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).content).toEqual({ foo: 'baz' })
  })

  it('should save to Supabase manually', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          })
        })
      })
    })

    const { result } = renderHook(() => useDraft({
      pageType: 'test',
      initialData: { foo: 'bar' }
    }))

    await act(async () => {
      await result.current.saveDraft({ foo: 'baz' }, true)
    })

    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-123',
      page_type: 'test',
      content: { foo: 'baz' }
    }), expect.any(Object))
    
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
      title: '草稿已保存',
      type: 'success'
    }))
  })

  it('should recover from localStorage if newer', async () => {
    const localData = { foo: 'local' }
    localStorage.setItem('draft_user-123_test', JSON.stringify({
      content: localData,
      updated_at: new Date(Date.now() + 1000).toISOString()
    }))

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { 
                content: { foo: 'remote' }, 
                updated_at: new Date(Date.now() - 1000).toISOString() 
              }, 
              error: null 
            })
          })
        })
      })
    })

    const onRecover = vi.fn()
    
    renderHook(() => useDraft({
      pageType: 'test',
      initialData: { foo: 'init' },
      onRecover
    }))

    await waitFor(() => {
      expect(onRecover).toHaveBeenCalledWith(localData)
    })
  })

  it('should recover from Supabase if newer', async () => {
    const localData = { foo: 'local' }
    localStorage.setItem('draft_user-123_test', JSON.stringify({
      content: localData,
      updated_at: new Date(Date.now() - 1000).toISOString()
    }))

    const remoteData = { foo: 'remote' }
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { 
                content: remoteData, 
                updated_at: new Date(Date.now() + 1000).toISOString() 
              }, 
              error: null 
            })
          })
        })
      })
    })

    const onRecover = vi.fn()
    
    renderHook(() => useDraft({
      pageType: 'test',
      initialData: { foo: 'init' },
      onRecover
    }))

    await waitFor(() => {
      expect(onRecover).toHaveBeenCalledWith(remoteData)
    })
  })

  it('should clear draft on completion', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    })

    mockFrom.mockReturnValue({
      delete: mockDelete,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          })
        })
      })
    })

    const { result } = renderHook(() => useDraft({
      pageType: 'test',
      initialData: { foo: 'bar' }
    }))

    localStorage.setItem('draft_user-123_test', 'some data')

    await act(async () => {
      await result.current.clearDraft()
    })

    expect(localStorage.getItem('draft_user-123_test')).toBeNull()
    expect(mockDelete).toHaveBeenCalled()
  })

  it('should prevent save after clearDraft is called', async () => {
    // Mock setup
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    })

    mockFrom.mockReturnValue({
      upsert: mockUpsert,
      delete: mockDelete,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          })
        })
      })
    })

    const { result } = renderHook(() => useDraft({
      pageType: 'test',
      initialData: { foo: 'bar' }
    }))

    // Call clearDraft
    await act(async () => {
      await result.current.clearDraft()
    })

    // Try to save manually
    await act(async () => {
      await result.current.saveDraft({ foo: 'baz' }, true)
    })

    // Expect upsert NOT to be called
    expect(mockUpsert).not.toHaveBeenCalled()

    // Try to save to local (via internal saveToLocal)
    // Note: saveDraft calls saveToLocal internally.
    // Check localStorage
    const stored = localStorage.getItem('draft_user-123_test')
    expect(stored).toBeNull()
  })

  it('should not save empty draft if isEmpty returns true', async () => {
    const isEmpty = (data: any) => data.foo === ''
    const { result } = renderHook(() => useDraft({
      pageType: 'test',
      initialData: { foo: '' },
      isEmpty
    }))

    // Try to save empty data
    await act(async () => {
      result.current.updateDraftData({ foo: '' })
      await result.current.saveDraft({ foo: '' }, true)
    })

    // Should not be in localStorage
    const stored = localStorage.getItem('draft_user-123_test')
    expect(stored).toBeNull()
  })

  it('should clear existing draft if saving empty data', async () => {
    const isEmpty = (data: any) => data.foo === ''
    const { result } = renderHook(() => useDraft({
      pageType: 'test',
      initialData: { foo: 'bar' },
      isEmpty
    }))

    // First save valid data
    await act(async () => {
      result.current.updateDraftData({ foo: 'valid' })
      await result.current.saveDraft({ foo: 'valid' }, true)
    })
    
    expect(localStorage.getItem('draft_user-123_test')).toBeTruthy()

    // Then save empty data
    await act(async () => {
      result.current.updateDraftData({ foo: '' })
      await result.current.saveDraft({ foo: '' }, true)
    })

    // Should be removed
    expect(localStorage.getItem('draft_user-123_test')).toBeNull()
  })
})
