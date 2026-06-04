import { useState, useCallback } from 'react'

export function useModal() {
  const [open,    setOpen]    = useState(false)
  const [payload, setPayload] = useState(null)

  const openModal  = useCallback((data = null) => { setPayload(data); setOpen(true)  }, [])
  const closeModal = useCallback(()             => { setPayload(null); setOpen(false) }, [])

  return { open, payload, openModal, closeModal }
}
