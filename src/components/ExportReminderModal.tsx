import { exportAppData } from '~/lib/exportData'
import { useAppStore } from '~/store/appStore'

interface ExportReminderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportReminderModal({
  isOpen,
  onClose,
}: ExportReminderModalProps) {
  const setDontRemindExport = useAppStore((state) => state.setDontRemindExport)

  const handleExport = () => {
    exportAppData()
    onClose()
  }

  const handleLater = () => {
    onClose()
  }

  const handleDontRemind = () => {
    setDontRemindExport(true)
    onClose()
  }

  if (!isOpen) return null

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-bold">Time to back up your data!</h3>
        <p className="py-4">
          It&apos;s been a while since you last backed up. To prevent data loss, we
          recommend exporting your data regularly. Your data is stored locally
          in this browser and could be lost if you clear your browser data.
        </p>
        <div className="modal-action flex-col gap-2 sm:flex-row">
          <button className="btn btn-primary w-full sm:w-auto" onClick={handleExport}>
            Export Now
          </button>
          <button className="btn btn-ghost w-full sm:w-auto" onClick={handleLater}>
            Later
          </button>
          <button
            className="btn btn-ghost text-base-content/60 w-full sm:w-auto"
            onClick={handleDontRemind}
          >
            Don&apos;t remind me
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleLater}>close</button>
      </form>
    </dialog>
  )
}
